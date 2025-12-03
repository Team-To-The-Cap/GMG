# app/routers/calc_func.py
# from ..services.place_hotspot import adjust_to_busy_station_area
from fastapi import APIRouter, Query, HTTPException
from typing import List, Tuple, Dict, Any, Literal
import osmnx as ox
import networkx as nx
from .. import models
from datetime import datetime, date, time, timedelta
from ..services.place_hotspot import adjust_to_busy_station_area
from sqlalchemy.orm import Session, joinedload
from ..database import get_db  # 이미 다른 곳에서 쓰고 있다면 생략

router = APIRouter(prefix="/api", tags=["meeting"])

# === 그래프 로드: 서버 시작 시 1회 ===
G = ox.load_graphml("/home/duram/GMG/backend/seoul_graph_out/drive.graphml")

import networkx as nx
G = G.to_undirected()   # 또는 nx.MultiGraph(G_directed)

MODE_SPEED_KMPH = {
    # 도보
    "도": 4.5,
    "도보": 4.5,
    "walk": 4.5,
    "WALK": 4.5,

    # 자동차
    "차": 30.0,
    "자동차": 30.0,
    "drive": 30.0,
    "DRIVE": 30.0,
}

def mode_to_speed_kph(mode: str) -> float:
    """교통수단 문자열을 속도(km/h)로 매핑. 없으면 기본적으로 30km/h."""
    return MODE_SPEED_KMPH.get(mode, 30.0)

'''
def snap_points_to_nodes(
    G: nx.MultiDiGraph,
    coords: List[Tuple[float, float]],
) -> List[int]:
    """
    osmnx.distance.nearest_nodes 대신,
    그래프의 모든 노드를 순회하면서
    (lon, lat) 유클리드 거리 기준으로 가장 가까운 노드 찾기.

    - G.nodes[n]["x"] : lon
    - G.nodes[n]["y"] : lat
    """

    if not coords:
        return []

    # 노드 id와 (x,y) 좌표 미리 뽑아두기
    node_ids = list(G.nodes)
    nodes_xy = [
        (G.nodes[n]["x"], G.nodes[n]["y"])
        for n in node_ids
    ]

    snapped: List[int] = []

    for lon, lat in coords:
        best_node = None
        best_d2 = float("inf")

        for nid, (x, y) in zip(node_ids, nodes_xy):
            dx = x - lon
            dy = y - lat
            d2 = dx * dx + dy * dy  # 유클리드 거리 제곱(루트 생략)

            if d2 < best_d2:
                best_d2 = d2
                best_node = nid

        snapped.append(best_node)

    return snapped
'''
def snap_points_to_nodes(
    G: nx.MultiDiGraph,
    coords: List[Tuple[float, float]],  # [(lon, lat), ...]
) -> List[int]:
    """
    osmnx.distance.nearest_nodes 를 사용해서
    (lon, lat) → 가장 가까운 그래프 노드 id 로 변환.
    """
    if not coords:
        return []

    xs = [lon for lon, lat in coords]  # 경도 리스트
    ys = [lat for lon, lat in coords]  # 위도 리스트

    # OSMnx 1.9.x 기준
    return ox.distance.nearest_nodes(G, X=xs, Y=ys)

"""
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
"""

from typing import List, Tuple, Dict, Any
import networkx as nx

def find_road_center_node_multi_mode(
    G: nx.MultiGraph,
    coords_lonlat: List[Tuple[float, float]],  # [(lon, lat), ...]
    modes: List[str],                          # 참가자별 교통수단
    return_paths: bool = True,
) -> Dict[str, Any]:
    """
    1번 방식:
    - 그래프는 drive 하나
    - 각 참가자마다 속도(도보/자동차 등)만 다르게 해서
      '소요 시간' 기준 minimax center를 찾는다.
    """

    if not coords_lonlat:
        raise ValueError("coords_lonlat is empty")

    if len(coords_lonlat) != len(modes):
        raise ValueError("coords_lonlat and modes must have same length")

    sources = snap_points_to_nodes(G, coords_lonlat)
    k = len(sources)

    # v별 통계
    counts: Dict[int, int] = {}      # v를 도달한 참가자 수
    max_costs: Dict[int, float] = {} # v에서의 최대 소요시간(sec)
    argmax_src: Dict[int, int] = {}  # 그 최대시간을 만든 참가자 출발노드
    all_paths: Dict[int, Dict[int, List[int]]] = {}

    # 참가자별로 Dijkstra 수행
    for s, mode in zip(sources, modes):
        speed_kph = mode_to_speed_kph(mode)

        # 1) 거리 기준 최단경로 (m)
        dists_m, paths = nx.single_source_dijkstra(G, s, weight="length")
        all_paths[s] = paths

        for v, dist_m in dists_m.items():
            # 2) 이 참가자의 v까지 시간(sec) = (m -> km) / km/h -> h -> sec
            t_sec = (dist_m / 1000.0) / max(speed_kph, 1e-6) * 3600.0

            # 도달한 사람 수
            counts[v] = counts.get(v, 0) + 1

            # v에서의 "최대 시간" 갱신
            if v not in max_costs or t_sec > max_costs[v]:
                max_costs[v] = t_sec
                argmax_src[v] = s

    if not counts:
        raise RuntimeError("No reachable nodes from any source.")

    # 3) 모든 참가자에게서 도달 가능한 노드를 우선 후보로,
    #    없으면 "가장 많은 참가자가 도달한" 노드들만 후보로 사용.
    max_reach = max(counts.values())
    candidates = [v for v, c in counts.items() if c == k] or [
        v for v, c in counts.items() if c == max_reach
    ]

    # 4) 후보 중에서 "최대 소요시간(max_costs[v])"이 최소인 노드 선택
    best = min(candidates, key=lambda v: max_costs.get(v, float("inf")))
    worst_src = argmax_src.get(best)
    worst_cost = max_costs.get(best, float("inf"))  # sec

    center_node = best
    center_lon = float(G.nodes[center_node]["x"])
    center_lat = float(G.nodes[center_node]["y"])

    res: Dict[str, Any] = {
        "node": int(center_node),
        "lon": center_lon,
        "lat": center_lat,
        "max_travel_time_s": float(worst_cost),
        "n_reached": int(counts[center_node]),
        "n_sources": int(k),
        "worst_source_node": int(worst_src) if worst_src is not None else None,
        "worst_cost": float(worst_cost),
    }
    
    # 5) per_person 정보까지 넣고 싶으면
    if return_paths:
        per: List[Dict[str, Any]] = []

        for idx, (s, mode) in enumerate(zip(sources, modes)):
            speed_kph = mode_to_speed_kph(mode)
            path_nodes = all_paths.get(s, {}).get(center_node)

            if path_nodes is None:
                per.append({
                    "index": idx,
                    "source_node": int(s),
                    "reachable": False,
                    "transportation": mode,
                })
            else:
                # 경로 거리/시간 계산
                dist_m = float(nx.path_weight(G, path_nodes, weight="length"))
                t_sec = (dist_m / 1000.0) / max(speed_kph, 1e-6) * 3600.0

                per.append({
                    "index": idx,
                    "source_node": int(s),
                    "reachable": True,
                    "transportation": mode,
                    # "path_nodes": list(map(int, path_nodes)),
                    "distance_m": dist_m,
                    "travel_time_s": t_sec,
                })

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
    result = find_road_center_node(
    G,
    coords,
    weight=weight,
    return_paths=True,
    top_k=3,   # 👈 추가: 상위 3개까지 계산
    )

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

# def get_common_available_dates(
#     participants: List[ParticipantResponse],
# ) -> List[date]:
#     """
#     모든 참가자의 available_times에서 공통으로 존재하는 '날짜(date)'만 반환한다.
    
#     - 각 ParticipantResponse.available_times 의 start_time 기준으로 날짜를 뽑음
#     - 한 참가자라도 그 날짜에 슬롯이 없으면 결과에서 제외
#     """
#     if not participants:
#         return []

#     # 첫 번째 참가자의 날짜 집합을 초기값으로 사용
#     common_dates: Set[date] = {
#         t.start_time.date() for t in participants[0].available_times
#     }

#     # 나머지 참가자들과 교집합을 계속 갱신
#     for p in participants[1:]:
#         dates_for_p = {t.start_time.date() for t in p.available_times}
#         common_dates &= dates_for_p
#         if not common_dates:
#             break  # 더 볼 필요 없음

#     # 정렬된 리스트로 반환 (프론트 사용 편하게)
#     return sorted(common_dates)

# from pydantic import BaseModel

# class CommonDatesResponse(BaseModel):
#     meeting_id: int
#     common_dates: List[date]

def find_road_center_node(
    G: nx.MultiDiGraph,
    coords_lonlat: List[Tuple[float, float]],
    weight: str = "length",
    return_paths: bool = True,
    top_k: int = 1,
) -> Dict[str, Any]:
    """
    모든 참가자가 같은 weight(예: length 또는 travel_time)를 쓴다고 가정하고
    그래프 위 minimax center(1-center)를 찾는 단일 모드 버전.

    - /api/meeting-point 에서 사용.
    - path_nodes(노드 시퀀스)는 계산/리턴하지 않고,
      v까지의 최단거리(또는 시간)만 사용.
    """
    if not coords_lonlat:
        raise ValueError("coords_lonlat is empty")

    # 🔥 1) 원본 좌표 찍기
    print("[DEBUG] input coords_lonlat:", coords_lonlat)

    sources = snap_points_to_nodes(G, coords_lonlat)
    k = len(sources)

    # 🔥 2) 스냅된 노드와 그 노드 좌표 찍기
    print("[DEBUG] snapped sources:", sources)
    for i, s in enumerate(sources):
        node = G.nodes[s]
        print(
            f"[DEBUG] source #{i}: node_id={s}, "
            f"node_lat={node.get('y')}, node_lon={node.get('x')}"
        )

    counts: Dict[int, int] = {}
    max_costs: Dict[int, float] = {}
    argmax_src: Dict[int, int] = {}
    # 각 source별로 "v까지의 거리/시간" 딕셔너리 저장 (path는 안 씀)
    dist_dicts: Dict[int, Dict[int, float]] = {}

    # 각 출발 노드 s에 대해 dijkstra (거리/시간만)
    for s in sources:
        # distances only (path X)
        dists = nx.single_source_dijkstra_path_length(G, s, weight=weight)
        dist_dicts[s] = dists

        print(f"[DEBUG] from source {s}: reached {len(dists)} nodes")

        for v, d in dists.items():
            counts[v] = counts.get(v, 0) + 1
            if v not in max_costs or d > max_costs[v]:
                max_costs[v] = d
                argmax_src[v] = s

    if not counts:
        raise RuntimeError("No reachable nodes from any source.")

    max_reach = max(counts.values())
    candidates = [v for v, c in counts.items() if c == k] or [
        v for v, c in counts.items() if c == max_reach
    ]

    print("[DEBUG] max_reach =", max_reach)
    print("[DEBUG] #candidates =", len(candidates))

    # max_costs 기준으로 오름차순 정렬해서 상위 top_k 개 선택
    sorted_candidates = sorted(
        candidates,
        key=lambda v: max_costs.get(v, float("inf")),
    )
    top_nodes = sorted_candidates[:top_k]

    # 대표 center (기존과 호환용)
    best = top_nodes[0]
    worst_src = argmax_src.get(best)
    worst_cost = max_costs.get(best, float("inf"))

    center_node = best
    center_lat = G.nodes[center_node]["y"]
    center_lon = G.nodes[center_node]["x"]
    print(
        f"[DEBUG] center node={center_node}, lat={center_lat}, lon={center_lon}"
    )

    # 각 source에서 center까지 거리/시간 디버그 출력
    for i, s in enumerate(sources):
        d = dist_dicts.get(s, {}).get(center_node)
        if d is None:
            print(f"[DEBUG] dist from source[{i}] node {s} → center {center_node}: UNREACHABLE")
        else:
            print(f"[DEBUG] dist from source[{i}] node {s} → center {center_node}: {d} ({weight})")

     # 대표 center 정보
    center_lon = float(G.nodes[center_node]["x"])
    center_lat = float(G.nodes[center_node]["y"])

    res: Dict[str, Any] = {
        "node": int(center_node),
        "lon": center_lon,
        "lat": center_lat,
        "max_distance_m": float(worst_cost) if weight == "length" else None,
        "max_travel_time_s": float(worst_cost) if weight != "length" else None,
        "n_reached": int(counts[center_node]),
        "n_sources": int(k),
        "worst_source_node": int(worst_src) if worst_src is not None else None,
        "worst_cost": float(worst_cost),
    }

    # ✅ 대표 center도 한 번 보정 (기존에 쓰던 코드 그대로)
    adjusted_main = adjust_to_busy_station_area(
        lat=center_lat,
        lng=center_lon,
        base_radius=400,
        station_search_radius=1500,
        min_score=5.0,
        min_poi_count=8,
    )
    res["adjusted_point"] = adjusted_main

    # ✅ top_k 후보들 + 각각 보정된 좌표까지 넣기
    top_list = []
    for node in top_nodes:
        lon = float(G.nodes[node]["x"])
        lat = float(G.nodes[node]["y"])

        candidate = {
            "node": int(node),
            "lon": lon,
            "lat": lat,
            "max_distance_m": float(max_costs[node]) if weight == "length" else None,
            "max_travel_time_s": float(max_costs[node]) if weight != "length" else None,
            "n_reached": int(counts[node]),
            "n_sources": int(k),
        }

        # 👇 여기서 각 후보별 보정 좌표 계산
        adjusted = adjust_to_busy_station_area(
            lat=lat,
            lng=lon,
            base_radius=400,
            station_search_radius=1500,
            min_score=5.0,
            min_poi_count=8,
        )
        candidate["adjusted_point"] = adjusted

        top_list.append(candidate)

    res["top_candidates"] = top_list

    # per_person에서도 path_nodes는 사용하지 않고, center까지의 거리/시간만 요약
    if return_paths:
        per: List[Dict[str, Any]] = []

        for idx, s in enumerate(sources):
            d = dist_dicts.get(s, {}).get(center_node)

            if d is None:
                per.append({
                    "index": idx,
                    "source_node": int(s),
                    "reachable": False,
                    "distance_m": None,
                    "travel_time_s": None,
                })
            else:
                if weight == "length":
                    distance_m = float(d)
                    travel_time_s = None
                else:  # weight == "travel_time" 인 경우 등
                    distance_m = None
                    travel_time_s = float(d)

                per.append({
                    "index": idx,
                    "source_node": int(s),
                    "reachable": True,
                    "distance_m": distance_m,
                    "travel_time_s": travel_time_s,
                })

        res["per_person"] = per

    return res


def get_common_available_dates_for_meeting(meeting: models.Meeting) -> List[date]:
    """
    특정 Meeting에 대해, 각 참가자의 ParticipantTime(start_time ~ end_time)을
    날짜 단위로 풀어서(set으로) 만든 뒤, 그 교집합(공통 날짜)만 반환한다.

    예)
    - P1: 18~20 → {18,19,20}
    - P2: 19~20 → {19,20}
      => 공통: {19,20}
    """

    # 참가자별 가능한 날짜 집합
    dates_by_participant: Dict[int, Set[date]] = {}

    for p in meeting.participants:
        dates: Set[date] = set()

        for t in p.available_times:
            start_d = t.start_time.date()
            end_d = t.end_time.date()
            # 안전장치: 혹시 end < start 로 들어오면 swap
            if end_d < start_d:
                start_d, end_d = end_d, start_d

            d = start_d
            while d <= end_d:
                dates.add(d)
                d = d + timedelta(days=1)

        if dates:
            dates_by_participant[p.id] = dates

    # 이 미팅에서 실제로 "시간을 입력한" 참가자가 한 명도 없으면 공통 날짜 없음
    if not dates_by_participant:
        return []

    participant_ids_with_times = list(dates_by_participant.keys())

    # 한 명만 시간 입력한 경우: 그 사람 날짜를 그대로 반환
    if len(participant_ids_with_times) == 1:
        only_pid = participant_ids_with_times[0]
        return sorted(dates_by_participant[only_pid])

    # 두 명 이상인 경우: 날짜 교집합
    common: Set[date] | None = None
    for pid in participant_ids_with_times:
        ds = dates_by_participant[pid]
        if common is None:
            common = set(ds)
        else:
            common &= ds
        if not common:
            break

    return sorted(common) if common else []


def save_calculated_places(db: Session, meeting_id: int, candidates: list[dict]):
    # 1) 기존 장소 삭제
    db_meeting = (
        db.query(models.Meeting)
        .options(joinedload(models.Meeting.places))
        .filter(models.Meeting.id == meeting_id)
        .first()
    )

    if db_meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # 기존 places 싹 비우기
    db_meeting.places = []
    db.commit()

    # 2) 새 장소 추가
    new_places: list[models.MeetingPlace] = []
    for c in candidates:
        db_place = models.MeetingPlace(
            meeting_id=meeting_id,
            name=c["name"],
            latitude=c["lat"],
            longitude=c["lng"],
            address=c["address"],
            category=c.get("category"),
            duration=c.get("duration"),

            # ⭐ 추가
            poi_name=c.get("poi_name"),
        )
        db.add(db_place)
        new_places.append(db_place)

    db.commit()
    for p in new_places:
        db.refresh(p)

    return new_places