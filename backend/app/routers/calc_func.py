# routers/meeting_point.py
from fastapi import APIRouter, Query
from typing import List, Tuple, Dict, Any, Literal
import osmnx as ox
import networkx as nx

router = APIRouter(prefix="/api", tags=["meeting"])

# === 그래프 로드: 서버 시작 시 1회 ===
G = ox.load_graphml("/home/duram/GMG/backend/seoul_graph_out/drive.graphml")

def snap_points_to_nodes(G: nx.MultiDiGraph, coords: List[Tuple[float, float]]) -> List[int]:
    xs = [lon for lon, lat in coords]
    ys = [lat for _, lat in coords]
    return ox.distance.nearest_nodes(G, X=xs, Y=ys)

def find_road_center_node(
    G: nx.MultiDiGraph,
    coords_lonlat: List[Tuple[float, float]],
    weight: str = "length",
    return_paths: bool = True,
) -> Dict[str, Any]:
    if not coords_lonlat:
        raise ValueError("coords_lonlat is empty")

    sources = snap_points_to_nodes(G, coords_lonlat)
    k = len(sources)

    counts: Dict[int, int] = {}
    max_costs: Dict[int, float] = {}
    argmax_src: Dict[int, int] = {}
    all_paths: Dict[int, Dict[int, List[int]]] = {}

    for s in sources:
        dists, paths = nx.single_source_dijkstra(G, s, weight=weight)
        all_paths[s] = paths
        for v, d in dists.items():
            counts[v] = counts.get(v, 0) + 1
            if v not in max_costs or d > max_costs[v]:
                max_costs[v] = d
                argmax_src[v] = s

    if not counts:
        raise RuntimeError("No reachable nodes from any source.")

    max_reach = max(counts.values())
    candidates = [v for v, c in counts.items() if c == k] or \
                 [v for v, c in counts.items() if c == max_reach]

    best = min(candidates, key=lambda v: max_costs.get(v, float("inf")))
    worst_src = argmax_src.get(최고)
    worst_cost = max_costs.get(best, float("inf"))

    res: Dict[str, Any] = {
        "node": int(최고),
        "lon": float(G.nodes[best]["x"]),
        "lat": float(G.nodes[best]["y"]),
        "max_distance_m": float(worst_cost) if weight == "length" else None,
        "max_travel_time_s": float(worst_cost) if weight != "length" else None,
        "n_reached": int(counts[best]),
        "n_sources": int(k),
        "worst_source_node": int(worst_src) if worst_src is not None else None,
        "worst_cost": float(worst_cost),
    }

    if return_paths:
        per = []
        edge_has_travel_time = any(
            "travel_time" in data for _, _, data in G.edges(data=True)
        )
        for idx, s in enumerate(sources):
            path_nodes = all_paths.get(s, {}).get(최고)
            if path_nodes is None:
                per.append({"index": idx, "source_node": int(s), "reachable": False})
            else:
                entry: Dict[str, Any] = {
                    "index": idx,
                    "source_node": int(s),
                    "path_nodes": list(map(int, path_nodes)),
                    "distance_m": float(nx.path_weight(G, path_nodes, weight="length")),
                    "travel_time_s": float(nx.path_weight(G, path_nodes, weight="travel_time")) if edge_has_travel_time else None,
                }
                per.append(entry)
        res["per_person"] = per

    return res

@router.get("/meeting-point")
def get_meeting_point(
    lons: List[float] = Query(...),
    lats: List[float] = Query(...),
    weight: str = Query("length", pattern="^(length|travel_time)$"),
    mode: Literal["full", "point", "geojson"] = "full",  # ← 추가
):
    if len(lons) != len(lats):
        return {"error": "lons, lats 길이가 다릅니다."}
    coords: List[Tuple[float, float]] = list(zip(lons, lats))
    result = find_road_center_node(G, coords, weight=weight, return_paths=True)

    # ↓↓↓ 얇은 응답 분기 ↓↓↓
    if mode == "point":
        # 좌표만
        return {"lon": result["lon"], "lat": result["lat"]}

    if mode == "geojson":
        # GeoJSON Point
        return {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [result["lon"], result["lat"]]
            },
            "properties": {
                "weight": weight,
                "n_sources": result["n_sources"],
                "max_cost": result["max_distance_m"] or result["max_travel_time_s"],
            }
        }

    # 기본(full)
    return result



from datetime import date
from typing import List, Set

# ParticipantResponse 와 ParticipantTimeResponse 를 그대로 사용한다고 가정

def get_common_available_dates(
    participants: List[ParticipantResponse],
) -> List[date]:
    """
    모든 참가자의 available_times에서 공통으로 존재하는 '날짜(date)'만 반환한다.
    
    - 각 ParticipantResponse.available_times 의 start_time 기준으로 날짜를 뽑음
    - 한 참가자라도 그 날짜에 슬롯이 없으면 결과에서 제외
    """
    if not participants:
        return []

    # 첫 번째 참가자의 날짜 집합을 초기값으로 사용
    common_dates: Set[date] = {
        t.start_time.date() for t in participants[0].available_times
    }

    # 나머지 참가자들과 교집합을 계속 갱신
    for p in participants[1:]:
        dates_for_p = {t.start_time.date() for t in p.available_times}
        common_dates &= dates_for_p
        if not common_dates:
            break  # 더 볼 필요 없음

    # 정렬된 리스트로 반환 (프론트 사용 편하게)
    return sorted(common_dates)

from pydantic import BaseModel

class CommonDatesResponse(BaseModel):
    meeting_id: int
    common_dates: List[date]