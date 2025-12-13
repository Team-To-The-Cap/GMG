# app/routers/calc_func.py
# from ..services.place_hotspot import adjust_to_busy_station_area
from fastapi import APIRouter, Query, HTTPException
from typing import List, Tuple, Dict, Any, Literal, Optional
import osmnx as ox
import networkx as nx
from .. import models
from datetime import datetime, date, time, timedelta
from ..services.place_hotspot import adjust_to_busy_station_area
from sqlalchemy.orm import Session, joinedload
from ..database import get_db  # 이미 다른 곳에서 쓰고 있다면 생략
import math
import asyncio
import logging

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["meeting"])

# === 그래프 로드: 서버 시작 시 1회 ===
import os
from pathlib import Path

# backend 루트 디렉토리 기준으로 상대 경로 사용
BACKEND_ROOT = (
    Path(__file__).resolve().parents[2]
)  # app/routers/calc_func.py -> backend/
GRAPH_PATH = BACKEND_ROOT / "seoul_graph_out" / "drive.graphml"

if not GRAPH_PATH.exists():
    raise FileNotFoundError(
        f"Graph file not found: {GRAPH_PATH}\n"
        f"Please ensure the graph file exists at: {GRAPH_PATH}"
    )

G = ox.load_graphml(str(GRAPH_PATH))

import networkx as nx

G = G.to_undirected()  # 또는 nx.MultiGraph(G_directed)

MODE_SPEED_KMPH = {
    # 자동차: 시속 10km (도심 평균 서행 기준)
    "차": 10.0,
    "자동차": 10.0,
    "drive": 10.0,
    "driving": 10.0,
    "car": 10.0,
    # 대중교통: 지하철 평균 속도 (도심 평균 35km/h, 환승 시간 고려)
    "대중교통": 25.0,  # 지하철 평균 속도 (환승 대기 시간 포함)
    "public": 25.0,
    "transit": 25.0,
    "bus": 20.0,      # 버스는 조금 느림
    "subway": 30.0,   # 지하철만 사용 시 더 빠름
}


def mode_to_speed_kph(mode: str) -> float:
    """
    교통수단 문자열을 속도(km/h)로 매핑.
    - 앞뒤 공백 제거 + 소문자 변환 후 매핑
    - 알 수 없는 값이면 400 에러를 터뜨려서 버그를 숨기지 않는다.
    """
    key = mode.strip().lower()

    if key not in MODE_SPEED_KMPH:
        raise HTTPException(
            status_code=400,
            detail=f"알 수 없는 이동 수단 모드입니다: {mode!r}. "
            f"지원하는 값 예시: 자동차, 대중교통, drive, public, bus, subway ... "
            f"(도보는 지원하지 않습니다)",
        )

    return MODE_SPEED_KMPH[key]


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
    coords_lonlat: List[Tuple[float, float]],
    modes: List[str],
    return_paths: bool = True,
    top_k: int = 3,
) -> Dict[str, Any]:

    print("\n" + "=" * 50)
    print(f"[DEBUG] 입력 좌표 개수: {len(coords_lonlat)}")
    print(f"[DEBUG] 입력 모드(raw): {modes}")

    if not coords_lonlat:
        raise ValueError("coords_lonlat is empty")

    # ✅ 길이 안 맞으면 조용히 채우지 말고 에러
    if len(modes) != len(coords_lonlat):
        raise HTTPException(
            status_code=500,
            detail=(
                f"coords 개수({len(coords_lonlat)})와 modes 개수({len(modes)})가 다릅니다. "
                "상위 로직/DB의 transportation 매핑을 확인하세요."
            ),
        )

    sources = snap_points_to_nodes(G, coords_lonlat)
    k = len(sources)

    # [DEBUG] 스냅된 노드와 참가자 정보 매칭 확인
    print("-" * 30)
    for i, (s, mode) in enumerate(zip(sources, modes)):
        node_data = G.nodes[s]
        speed = mode_to_speed_kph(mode)
        print(f"[참가자 {i}] Mode: {mode:<6} | Speed: {speed} km/h")
        print(f"   ㄴ 입력 좌표: {coords_lonlat[i]}")
        print(f"   ㄴ 매칭 노드: {s} (Lon: {node_data['x']}, Lat: {node_data['y']})")
    print("-" * 30)

    counts: Dict[int, int] = {}
    node_stats: Dict[int, Dict[str, float]] = {}
    dist_matrix: Dict[int, Dict[int, float]] = {}
    
    # 도보는 직선거리 기반으로 계산 (도로 그래프 사용 안 함)
    import math
    
    def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """두 지점 간 직선거리(미터) 계산"""
        R = 6371000  # 지구 반지름 (m)
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    # 1. 이동수단별 분류 및 사용자 확인
    transit_indices = [
        i for i, mode in enumerate(modes) 
        if mode_to_speed_kph(mode) >= 20.0 and mode_to_speed_kph(mode) < 50.0
    ]
    driving_indices = [
        i for i, mode in enumerate(modes) 
        if mode_to_speed_kph(mode) < 20.0
    ]
    
    # 대중교통 사용자 확인
    has_transit_user = len(transit_indices) > 0
    
    # 자동차: 그래프 기반 계산
    for idx in driving_indices:
        s = sources[idx]
        mode = modes[idx]
        speed_kph = mode_to_speed_kph(mode)
        dists_m = nx.single_source_dijkstra_path_length(G, s, weight="length")
        dist_matrix[idx] = dists_m

        for v, dist_m in dists_m.items():
            t_sec = (dist_m / 1000.0) / max(speed_kph, 0.1) * 3600.0

            counts[v] = counts.get(v, 0) + 1

            if v not in node_stats:
                node_stats[v] = {"min": t_sec, "max": t_sec}
            else:
                if t_sec > node_stats[v]["max"]:
                    node_stats[v]["max"] = t_sec
                if t_sec < node_stats[v]["min"]:
                    node_stats[v]["min"] = t_sec
    
    # 대중교통: 직선거리 기반 계산 (지하철 노선을 따라가므로 1.2배 보정, 환승 시간 포함)
    TRANSIT_DETOUR_FACTOR = 1.2  # 대중교통은 직선거리보다 약 20% 더 걸림
    TRANSIT_TRANSFER_TIME = 5 * 60  # 환승 대기 시간 5분 (초 단위)
    for idx in transit_indices:
        s = sources[idx]
        mode = modes[idx]
        speed_kph = mode_to_speed_kph(mode)
        start_lat = G.nodes[s]["y"]
        start_lon = G.nodes[s]["x"]
        
        # 모든 노드에 대해 직선거리 계산
        transit_dists: Dict[int, float] = {}
        for v in G.nodes():
            v_lat = G.nodes[v]["y"]
            v_lon = G.nodes[v]["x"]
            # 직선거리 * 보정계수 = 실제 대중교통 거리
            straight_dist = haversine_distance_m(start_lat, start_lon, v_lat, v_lon)
            transit_dists[v] = straight_dist * TRANSIT_DETOUR_FACTOR
        
        dist_matrix[idx] = transit_dists
        
        for v, dist_m in transit_dists.items():
            # 이동 시간 + 환승 시간
            travel_time = (dist_m / 1000.0) / max(speed_kph, 0.1) * 3600.0
            t_sec = travel_time + TRANSIT_TRANSFER_TIME

            counts[v] = counts.get(v, 0) + 1

            if v not in node_stats:
                node_stats[v] = {"min": t_sec, "max": t_sec}
            else:
                if t_sec > node_stats[v]["max"]:
                    node_stats[v]["max"] = t_sec
                if t_sec < node_stats[v]["min"]:
                    node_stats[v]["min"] = t_sec
    
    if not counts:
        raise RuntimeError("No reachable nodes.")

    max_reach = max(counts.values())
    candidates = [v for v, c in counts.items() if c == k]
    if not candidates:
        candidates = [v for v, c in counts.items() if c == max_reach]
    
    print(f"[DEBUG] 초기 후보군: {len(candidates)}개 (모든 참가자가 도달 가능한 노드)")
    
    # 대중교통 사용자가 있으면 후보군을 더 많이 확장 (더 넓은 범위 탐색)
    if has_transit_user and len(candidates) < top_k * 2:
        # 도달 가능한 노드 중 상위 더 많은 후보 추가
        sorted_by_reach = sorted(
            counts.items(), 
            key=lambda x: (x[1], -node_stats.get(x[0], {}).get("max", float("inf"))),
            reverse=True
        )
        # 상위 후보들을 추가 (이미 candidates에 있는 것은 제외)
        additional = [
            v for v, c in sorted_by_reach[:top_k * 3]
            if v not in candidates and c >= max_reach - 1
        ]
        candidates.extend(additional[:top_k * 2])

    # [DEBUG] 후보군 점수 계산 로그 (상위 3개만 출력)
    # 이동수단별 가중치: 대중교통 >> 자동차 순으로 우선순위 (자동차 불리하게)
    MODE_WEIGHTS = {
        "transit": 1.5,   # 대중교통은 유리하게
        "public": 1.5,
        "대중교통": 1.5,
        "bus": 1.5,
        "subway": 1.5,
        "drive": 0.7,     # 자동차는 불리하게 (패널티)
        "driving": 0.7,
        "자동차": 0.7,
        "car": 0.7,
    }
    
    FAIRNESS_WEIGHT = 1.3  # 공평성 가중치 (대중교통 사용자 고려)
    
    def calculate_score(v_id):
        stats = node_stats[v_id]
        max_t = stats["max"]
        min_t = stats["min"]
        diff = max_t - min_t
        
        # 각 참가자별 시간을 가중치 적용하여 재계산
        weighted_times = []
        for idx, mode in enumerate(modes):
            d_m = dist_matrix.get(idx, {}).get(v_id)
            if d_m is not None:
                speed_kph = mode_to_speed_kph(mode)
                t_sec = (d_m / 1000.0) / max(speed_kph, 0.1) * 3600.0
                # 대중교통은 환승 시간 추가
                if speed_kph >= 20.0 and speed_kph < 50.0:
                    t_sec += TRANSIT_TRANSFER_TIME
                
                weight = MODE_WEIGHTS.get(mode.lower(), 1.0)
                weighted_times.append(t_sec * weight)
        
        if weighted_times:
            # 원본 시간 (가중치 적용 전)도 추적
            raw_times = []
            for idx, mode in enumerate(modes):
                d_m = dist_matrix.get(idx, {}).get(v_id)
                if d_m is not None:
                    speed_kph = mode_to_speed_kph(mode)
                    t_sec = (d_m / 1000.0) / max(speed_kph, 0.1) * 3600.0
                    if speed_kph >= 20.0 and speed_kph < 50.0:
                        t_sec += TRANSIT_TRANSFER_TIME
                    raw_times.append(t_sec)
            
            weighted_max = max(weighted_times)
            weighted_min = min(weighted_times)
            weighted_diff = weighted_max - weighted_min
            raw_max = max(raw_times) if raw_times else weighted_max
            
            # 대중교통/자동차 사용자를 우선 고려한 점수 계산
            # 대중교통 > 자동차 순으로 우선순위
            transit_times = []
            driving_times = []
            
            for idx, mode in enumerate(modes):
                d_m = dist_matrix.get(idx, {}).get(v_id)
                if d_m is not None:
                    speed_kph = mode_to_speed_kph(mode)
                    t_sec = (d_m / 1000.0) / max(speed_kph, 0.1) * 3600.0
                    if speed_kph >= 20.0 and speed_kph < 50.0:
                        t_sec += TRANSIT_TRANSFER_TIME
                        transit_times.append(t_sec)
                    else:
                        driving_times.append(t_sec)
            
            # 대중교통 사용자가 있을 때
            if has_transit_user and transit_times:
                max_transit_time = max(transit_times)
                # 대중교통 시간이 최댓값이면 강하게 반영
                if max_transit_time == raw_max:
                    score = max_transit_time * 2.0 + (weighted_diff * FAIRNESS_WEIGHT)
                else:
                    score = weighted_max * 1.3 + (weighted_diff * FAIRNESS_WEIGHT)
            else:
                # 자동차만 있거나 일반적인 경우 - 자동차에 강한 패널티
                if driving_times:
                    max_driving_time = max(driving_times)
                    # 자동차 시간에 강한 패널티 적용
                    score = weighted_max * 1.3 + max_driving_time * 0.5 + (weighted_diff * FAIRNESS_WEIGHT * 0.7)
                else:
                    score = weighted_max * 1.3 + (weighted_diff * FAIRNESS_WEIGHT * 0.7)
        else:
            # fallback: 기존 방식
            score = max_t + (diff * FAIRNESS_WEIGHT)
        
        return score

    # 대중교통 사용자가 있을 때 후보 품질 개선
    if has_transit_user:
        # 대중교통 시간이 너무 긴 후보는 제외 (90분 초과)
        filtered_candidates = []
        for v_id in candidates:
            max_transit_time = 0.0
            for idx in transit_indices:
                d_m = dist_matrix.get(idx, {}).get(v_id)
                if d_m is not None:
                    speed_kph = mode_to_speed_kph(modes[idx])
                    t_sec = (d_m / 1000.0) / max(speed_kph, 0.1) * 3600.0 + TRANSIT_TRANSFER_TIME
                    if t_sec > max_transit_time:
                        max_transit_time = t_sec
            
            # 대중교통 시간이 90분 이하인 후보만 포함
            if max_transit_time <= 5400:  # 90분 = 5400초
                filtered_candidates.append(v_id)
        
        if filtered_candidates:
            candidates = filtered_candidates
            print(f"[DEBUG] 대중교통 시간 필터링: {len(candidates)}개 후보 (90분 이하)")
    
    print(f"[DEBUG] 필터링 후 최종 후보군: {len(candidates)}개")
    
    sorted_candidates = sorted(candidates, key=calculate_score)
    top_nodes = sorted_candidates[:top_k]
    best_node = top_nodes[0]

    # 상세 로그: 모든 후보군 정보 출력
    print("\n" + "=" * 80)
    print(f"[CANDIDATE DETAILS] 후보군 상세 정보 (총 {len(sorted_candidates)}개 후보 중 상위 {len(top_nodes)}개)")
    print("=" * 80)
    
    for rank, node_id in enumerate(sorted_candidates[:top_k], 1):
        node_lat = G.nodes[node_id]["y"]
        node_lon = G.nodes[node_id]["x"]
        score = calculate_score(node_id)
        max_time = node_stats[node_id]["max"]
        min_time = node_stats[node_id]["min"]
        
        print(f"\n[후보 #{rank}] 노드 ID: {node_id}")
        print(f"  위치: 위도 {node_lat:.6f}, 경도 {node_lon:.6f}")
        print(f"  점수: {score:.2f}")
        print(f"  최소 시간: {min_time/60:.1f}분 ({min_time:.0f}초)")
        print(f"  최대 시간: {max_time/60:.1f}분 ({max_time:.0f}초)")
        print(f"  참가자별 시간:")
        
        # 각 참가자별 시간 출력
        for idx, (coord, mode) in enumerate(zip(coords_lonlat, modes)):
            d_m = dist_matrix.get(idx, {}).get(node_id)
            if d_m is not None:
                speed_kph = mode_to_speed_kph(mode)
                t_sec = (d_m / 1000.0) / max(speed_kph, 0.1) * 3600.0
                # 대중교통은 환승 시간 추가
                if speed_kph >= 20.0 and speed_kph < 50.0:
                    t_sec += TRANSIT_TRANSFER_TIME
                
                participant_coord = f"({coord[0]:.6f}, {coord[1]:.6f})"
                print(f"    - 참가자 {idx+1} [{mode}]: {t_sec/60:.1f}분 ({t_sec:.0f}초) | 출발지: {participant_coord}")
            else:
                print(f"    - 참가자 {idx+1} [{mode}]: 도달 불가")
        
        if rank == 1:
            print(f"  ⭐ 최종 선택됨!")
    
    print("\n" + "=" * 80)
    print(f"[FINAL SELECTION] 최종 선정 노드: {best_node}")
    print(f"  위치: 위도 {G.nodes[best_node]['y']:.6f}, 경도 {G.nodes[best_node]['x']:.6f}")
    print(f"  점수: {calculate_score(best_node):.2f}")
    print(f"  최대 시간: {node_stats[best_node]['max']/60:.1f}분 ({node_stats[best_node]['max']:.0f}초)")
    print("=" * 80 + "\n")

    # 결과 구성 (기존 코드와 동일)
    worst_cost = node_stats[best_node]["max"]
    res: Dict[str, Any] = {
        "node": int(best_node),
        "lon": float(G.nodes[best_node]["x"]),
        "lat": float(G.nodes[best_node]["y"]),
        "max_travel_time_s": float(worst_cost),
        "n_reached": int(counts[best_node]),
        "n_sources": int(k),
        "top_candidates": [],
    }

    # (이하 보정 로직 및 return_paths 처리 로직은 기존 코드 그대로 유지)
    res["adjusted_point"] = adjust_to_busy_station_area(
        lat=res["lat"],
        lng=res["lon"],
        base_radius=400,
        station_search_radius=1500,
        min_score=5.0,
        min_poi_count=8,
    )

    for node in top_nodes:
        lon = float(G.nodes[node]["x"])
        lat = float(G.nodes[node]["y"])
        cost = node_stats[node]["max"]
        cand_obj = {
            "node": int(node),
            "lon": lon,
            "lat": lat,
            "max_travel_time_s": float(cost),
            "n_reached": int(counts[node]),
        }
        cand_obj["adjusted_point"] = adjust_to_busy_station_area(
            lat=lat,
            lng=lon,
            base_radius=400,
            station_search_radius=1500,
            min_score=5.0,
            min_poi_count=8,
        )
        res["top_candidates"].append(cand_obj)

    if return_paths:
        per: List[Dict[str, Any]] = []
        for idx, (s, mode) in enumerate(zip(sources, modes)):
            speed_kph = mode_to_speed_kph(mode)
            d_m = dist_matrix.get(idx, {}).get(best_node)
            if d_m is None:
                per.append(
                    {
                        "index": idx,
                        "source_node": int(s),
                        "reachable": False,
                        "transportation": mode,
                    }
                )
            else:
                t_sec = (d_m / 1000.0) / max(speed_kph, 0.1) * 3600.0
                per.append(
                    {
                        "index": idx,
                        "source_node": int(s),
                        "reachable": True,
                        "transportation": mode,
                        "distance_m": float(d_m),
                        "travel_time_s": float(t_sec),
                    }
                )
        res["per_person"] = per
    print("[DEBUG][CENTER]", "best_node =", best_node)
    for row in res.get("per_person", []):
        print(
            f"  - idx={row['index']}, mode={row['transportation']}, "
            f"dist={row['distance_m']:.1f}m, time={row['travel_time_s']/60:.1f}min"
        )
    return res


@router.get("/meeting-point")
def get_meeting_point(
    lons: List[float] = Query(...),
    lats: List[float] = Query(...),
    # modes: ?modes=walk&modes=public&modes=drive ... 순서대로 매핑
    modes: List[str] = Query(None),
    weight: str = Query(
        "time", description="내부적으로 multi-mode일 때는 무조건 time 기준입니다."
    ),
    mode: Literal["full", "point", "geojson"] = "full",
):
    """
    [API] 중간 지점 찾기
    - modes가 주어지지 않으면 모두 'drive'로 가정합니다.
    - 'public'이 입력되면 'drive'와 동일한 속도로 계산합니다.
    """
    if len(lons) != len(lats):
        raise HTTPException(status_code=400, detail="lons와 lats의 길이가 다릅니다.")

    # modes 기본값 처리
    if not modes:
        # 아무것도 안 들어오면 전부 자동차로 가정
        modes = ["drive"] * len(lons)
    elif len(modes) != len(lons):
        # 조용히 채우지 말고, 아예 에러를 내서 버그를 드러내자
        raise HTTPException(
            status_code=400,
            detail=(
                f"좌표 개수({len(lons)})와 modes 개수({len(modes)})가 다릅니다. "
                "예: ?modes=도보&modes=자동차 처럼 사람 수만큼 modes를 보내 주세요."
            ),
        )

    coords: List[Tuple[float, float]] = list(zip(lons, lats))

    # 멀티 모드 계산 호출
    result = find_road_center_node_multi_mode(
        G, coords, modes=modes, return_paths=True, top_k=3
    )

    # 응답 형식 분기 (기존 유지)
    if mode == "point":
        return {"lon": result["lon"], "lat": result["lat"]}

    if mode == "geojson":
        return {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [result["lon"], result["lat"]],
            },
            "properties": {
                "max_travel_time_s": result["max_travel_time_s"],
                "n_sources": result["n_sources"],
            },
        }

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


def generate_grid_candidates(
    participants: List[Dict[str, Any]],
    grid_size: int = 6,
    expand_factor: float = 0.2,
) -> List[Dict[str, float]]:
    """
    참가자들의 경계 상자를 기반으로 그리드 샘플링 후보 생성
    
    Args:
        participants: [{"lat": float, "lng": float}, ...]
        grid_size: 그리드 크기 (grid_size x grid_size 후보 생성)
        expand_factor: 경계 상자 확장 비율 (기본 20%)
    
    Returns:
        [{"lat": float, "lng": float}, ...]
    """
    if not participants:
        return []
    
    # 경계 상자 계산
    lats = [p["lat"] for p in participants]
    lngs = [p["lng"] for p in participants]
    
    min_lat, max_lat = min(lats), max(lats)
    min_lng, max_lng = min(lngs), max(lngs)
    
    # 여유 공간 추가
    lat_range = max_lat - min_lat
    lng_range = max_lng - min_lng
    min_lat -= lat_range * expand_factor
    max_lat += lat_range * expand_factor
    min_lng -= lng_range * expand_factor
    max_lng += lng_range * expand_factor
    
    # 그리드 샘플링
    candidates = []
    lat_step = (max_lat - min_lat) / (grid_size - 1) if grid_size > 1 else 0
    lng_step = (max_lng - min_lng) / (grid_size - 1) if grid_size > 1 else 0
    
    for i in range(grid_size):
        for j in range(grid_size):
            candidate_lat = min_lat + i * lat_step
            candidate_lng = min_lng + j * lng_step
            candidates.append({
                "lat": candidate_lat,
                "lng": candidate_lng,
                "type": "grid"
            })
    
    return candidates


def generate_station_candidates(
    center_lat: float,
    center_lng: float,
    radius: int = 5000,
    max_stations: int = 15,
) -> List[Dict[str, Any]]:
    """
    지하철역 기반 후보 생성
    
    Args:
        center_lat: 중심 위도
        center_lng: 중심 경도
        radius: 탐색 반경 (미터)
        max_stations: 최대 역 개수
    
    Returns:
        [{"lat": float, "lng": float, "name": str, "type": "station"}, ...]
    """
    try:
        from ..services.google_places_services import fetch_nearby_stations
        
        stations = fetch_nearby_stations(
            lat=center_lat,
            lng=center_lng,
            radius=radius
        )
        
        candidates = []
        for station in stations[:max_stations]:
            loc = station.get("geometry", {}).get("location", {})
            if loc.get("lat") and loc.get("lng"):
                candidates.append({
                    "lat": float(loc["lat"]),
                    "lng": float(loc["lng"]),
                    "name": station.get("name"),
                    "type": "station",
                    "place_id": station.get("place_id")
                })
        
        log.info(f"[HYBRID] Generated {len(candidates)} station candidates")
        return candidates
    except Exception as e:
        log.warning(f"[HYBRID] Failed to generate station candidates: {e}")
        return []


def calculate_max_travel_time_for_candidate(
    participants: List[Dict[str, Any]],
    modes: List[str],
    candidate_lat: float,
    candidate_lng: float,
) -> Optional[float]:
    """
    특정 후보 위치에 대한 최대 이동 시간 계산 (실제 API 사용)
    
    Args:
        participants: [{"lat": float, "lng": float, "transportation": str}, ...]
        modes: ["walk", "drive", "public", ...]
        candidate_lat: 후보 위도
        candidate_lng: 후보 경도
    
    Returns:
        최대 이동 시간 (초) 또는 None
    """
    max_time = 0.0
    has_valid_time = False
    
    for p, mode in zip(participants, modes):
        plat = p.get("lat")
        plng = p.get("lng")
        if plat is None or plng is None:
            continue
        
        transportation = p.get("transportation", "").strip().lower()
        
        # 도보는 Naver Walking API 사용
        if mode in ["walk", "walking", "도보"] or transportation in ["walk", "walking", "도보"]:
            try:
                from ..services.naver_directions import (
                    extract_travel_time_from_walking_response,
                    get_walking_direction
                )
                
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_closed():
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                
                # 타임아웃 설정 (10초)
                walking_data = loop.run_until_complete(
                    asyncio.wait_for(
                        get_walking_direction(
                            start_lat=float(plat),
                            start_lng=float(plng),
                            goal_lat=float(candidate_lat),
                            goal_lng=float(candidate_lng),
                        ),
                        timeout=10.0
                    )
                )
                
                if walking_data:
                    duration_sec = extract_travel_time_from_walking_response(walking_data)
                    if duration_sec:
                        max_time = max(max_time, float(duration_sec))
                        has_valid_time = True
                        continue
            except asyncio.TimeoutError:
                log.warning(f"[HYBRID] Naver Walking API timeout for candidate")
            except Exception as e:
                log.warning(f"[HYBRID] Naver Walking API failed: {e}")
        
        # 자동차/대중교통은 Google API 사용
        try:
            from ..services.google_distance_matrix import get_travel_time_single
            from ..services.google_distance_matrix import _transportation_to_google_mode
            
            google_mode = _transportation_to_google_mode(transportation)
            result = get_travel_time_single(
                start_lat=float(plat),
                start_lng=float(plng),
                goal_lat=float(candidate_lat),
                goal_lng=float(candidate_lng),
                mode=google_mode,
            )
            
            if result and result.get("success"):
                duration_sec = result.get("duration_seconds")
                if duration_sec:
                    max_time = max(max_time, float(duration_sec))
                    has_valid_time = True
        except Exception as e:
            log.warning(f"[HYBRID] Google API failed: {e}")
    
    return max_time if has_valid_time else None


def find_optimal_location_hybrid(
    participants: List[Dict[str, Any]],
    modes: List[str],
    use_stations: bool = True,
    grid_size: int = 4,  # 기본값 4x4 = 16개 후보
    top_k: int = 5,  # 기본값 5개 후보
) -> List[Dict[str, Any]]:
    """
    하이브리드 접근법으로 최적 위치 후보 생성
    
    1. 지하철역 기반 후보 (대중교통 사용자 있을 때)
    2. 그리드 샘플링으로 초기 후보 생성
    3. 실제 API로 평가하여 상위 후보 선정
    
    Args:
        participants: [{"lat": float, "lng": float, "transportation": str}, ...]
        modes: ["walk", "drive", "public", ...]
        use_stations: 지하철역 후보 포함 여부
        grid_size: 그리드 크기
        top_k: 최종 반환할 후보 개수
    
    Returns:
        [{"lat": float, "lng": float, "max_time": float, "type": str, "score": float}, ...]
    """
    log.info(f"[HYBRID] Starting hybrid location search for {len(participants)} participants")
    
    candidates = []
    
    # 1. 지하철역 기반 후보 (대중교통 사용자가 있을 때)
    has_transit = any(m in ["transit", "public", "대중교통"] for m in modes)
    if use_stations and has_transit:
        center_lat = sum(p["lat"] for p in participants) / len(participants)
        center_lng = sum(p["lng"] for p in participants) / len(participants)
        
        station_candidates = generate_station_candidates(
            center_lat=center_lat,
            center_lng=center_lng,
            radius=5000,
            max_stations=5  # 지하철역 후보도 5개로 제한
        )
        candidates.extend(station_candidates)
        log.info(f"[HYBRID] Added {len(station_candidates)} station candidates")
    
    # 2. 그리드 샘플링 후보
    grid_candidates = generate_grid_candidates(
        participants=participants,
        grid_size=grid_size,
        expand_factor=0.2
    )
    candidates.extend(grid_candidates)
    log.info(f"[HYBRID] Added {len(grid_candidates)} grid candidates")
    
    # 3. 실제 API로 평가 (에러 처리 강화)
    scored_candidates = []
    max_evaluations = min(len(candidates), 30)  # 최대 30개만 평가 (API 호출 제한)
    
    for i, candidate in enumerate(candidates[:max_evaluations]):
        try:
            log.debug(f"[HYBRID] Evaluating candidate {i+1}/{max_evaluations}")
            
            max_time = calculate_max_travel_time_for_candidate(
                participants=participants,
                modes=modes,
                candidate_lat=candidate["lat"],
                candidate_lng=candidate["lng"],
            )
            
            if max_time is not None:
                scored_candidates.append({
                    **candidate,
                    "max_time": max_time,
                    "score": max_time  # minimax 기준: 최댓값이 낮을수록 좋음
                })
            else:
                log.warning(f"[HYBRID] Failed to calculate time for candidate {i+1}")
        except Exception as e:
            log.error(f"[HYBRID] Error evaluating candidate {i+1}: {e}", exc_info=True)
            continue  # 에러가 발생해도 다음 후보 계속 평가
    
    if not scored_candidates:
        log.error("[HYBRID] No valid candidates after evaluation")
        raise ValueError("No valid candidates found after API evaluation")
    
    # 4. 점수 기준으로 정렬하여 상위 후보 반환
    scored_candidates.sort(key=lambda x: x["score"])
    top_candidates = scored_candidates[:top_k]
    
    log.info(f"[HYBRID] Selected {len(top_candidates)} top candidates from {len(scored_candidates)} evaluated")
    
    return top_candidates


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
    print(f"[DEBUG] center node={center_node}, lat={center_lat}, lon={center_lon}")

    # 각 source에서 center까지 거리/시간 디버그 출력
    for i, s in enumerate(sources):
        d = dist_dicts.get(s, {}).get(center_node)
        if d is None:
            print(
                f"[DEBUG] dist from source[{i}] node {s} → center {center_node}: UNREACHABLE"
            )
        else:
            print(
                f"[DEBUG] dist from source[{i}] node {s} → center {center_node}: {d} ({weight})"
            )

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
                per.append(
                    {
                        "index": idx,
                        "source_node": int(s),
                        "reachable": False,
                        "distance_m": None,
                        "travel_time_s": None,
                    }
                )
            else:
                if weight == "length":
                    distance_m = float(d)
                    travel_time_s = None
                else:  # weight == "travel_time" 인 경우 등
                    distance_m = None
                    travel_time_s = float(d)

                per.append(
                    {
                        "index": idx,
                        "source_node": int(s),
                        "reachable": True,
                        "distance_m": distance_m,
                        "travel_time_s": travel_time_s,
                    }
                )

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
