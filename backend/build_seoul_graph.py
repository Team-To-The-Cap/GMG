# filename: build_seoul_graph.py
# (권장) conda 환경: conda install -c conda-forge geopandas shapely pyproj scipy pyogrio
# pip: pip install osmnx==1.9.3 networkx matplotlib

import os
import osmnx as ox
import networkx as nx
import matplotlib
matplotlib.use("Agg")  # GUI 창 띄우지 않고 파일로만 저장
import matplotlib.pyplot as plt

# ===================== 사용자 설정 =====================
# True면 시청 기준 반경 DIST_M만(빠른 테스트), False면 "서울 전체"
SMALL_TEST = False
DIST_M = 2000
PLACE_NAME = "Seoul, South Korea"
CENTER = (37.5665, 126.9780)  # 서울시청

# 그래프 단순화/성분 유지 옵션
SIMPLIFY = True         # True: 교차로/막다른길만 노드로 (권장)
RETAIN_ALL = True       # True: 단절 성분까지 유지

# 출력 폴더
OUTDIR = "seoul_graph_out"
# 만들 모드들
MODES = ["drive", "walk", "bike"]
# =======================================================

# OSMnx 전역 설정
ox.settings.use_cache = True
ox.settings.log_console = True
ox.settings.requests_timeout = 180
ox.settings.cache_folder = os.path.join(OUTDIR, "cache")
os.makedirs(OUTDIR, exist_ok=True)

# 모드별 기본 속도(km/h) (maxspeed 없을 때 사용)
DEFAULT_SPEEDS = {
    "drive": {
        "motorway": 90, "trunk": 80, "primary": 60, "secondary": 50,
        "tertiary": 40, "residential": 30, "unclassified": 30, "service": 20
    },
    "walk":  {"footway": 4.5, "path": 4.0, "pedestrian": 4.5, "residential": 4.5},
    "bike":  {"cycleway": 15, "residential": 12, "tertiary": 18, "secondary": 20, "primary": 22},
}

def _parse_speed_kph(edge_data, mode="drive"):
    """edge.maxspeed 또는 highway 타입에서 km/h 추정"""
    spd = edge_data.get("maxspeed")
    if isinstance(spd, list) and spd:
        spd = spd[0]
    if spd:
        try:
            return float(str(spd).split()[0])  # "50 km/h" -> 50
        except Exception:
            pass

    hwy = edge_data.get("highway")
    if isinstance(hwy, list) and hwy:
        hwy = hwy[0]
    defaults = DEFAULT_SPEEDS.get(mode, {})
    if hwy in defaults:
        return defaults[hwy]
    # fallback
    return 40.0 if mode == "drive" else (15.0 if mode == "bike" else 4.5)

def add_travel_time(G, mode="drive"):
    """간선에 travel_time(초) 추가"""
    for u, v, k, data in G.edges(keys=True, data=True):
        L = float(data.get("length", 0.0) or 0.0)  # meters
        kph = max(_parse_speed_kph(data, mode), 1e-6)
        data["travel_time"] = (L / 1000.0) / kph * 3600.0
    return G

def _route_sum_attr(G, route_nodes, attr):
    """경로(노드 리스트) 위 간선 attr 합계 (MultiDiGraph 안전)"""
    vals = ox.utils_graph.get_route_edge_attributes(
        G, route_nodes, attr, minimize_key="length"
    )
    return sum(float(v or 0.0) for v in vals)

def plot_and_save(G, route_nodes, fname_png):
    fig, ax = ox.plot_graph_route(
        G, route_nodes, node_size=0, route_linewidth=3, route_alpha=0.9,
        bgcolor="white", show=False, close=False
    )
    fig.savefig(fname_png, dpi=220, bbox_inches="tight")
    plt.close(fig)

def build_graph(mode):
    """OSMnx로 그래프 생성"""
    if SMALL_TEST:
        G = ox.graph_from_point(
            CENTER, dist=DIST_M, network_type=mode,
            simplify=SIMPLIFY, retain_all=RETAIN_ALL
        )
    else:
        G = ox.graph_from_place(
            PLACE_NAME, network_type=mode,
            simplify=SIMPLIFY, retain_all=RETAIN_ALL
        )
    return G

def save_graph(G, mode, outdir=OUTDIR):
    """GraphML/GPKG 저장"""
    graphml = os.path.join(outdir, f"{mode}.graphml")
    gpkg = os.path.join(outdir, f"{mode}.gpkg")
    ox.save_graphml(G, graphml)
    # GPKG 저장은 GDAL 경고가 뜰 수 있으나 기능엔 지장 없음
    ox.save_graph_geopackage(G, filepath=gpkg, directed=True)
    return graphml, gpkg

def shortest_routes_and_plots(G, mode, outdir=OUTDIR):
    """시청→남산타워 경로(거리/시간) 계산 + PNG 저장 (경로 없으면 안내)"""
    origin = CENTER
    dest   = (37.5512, 126.9882)
    try:
        o = ox.nearest_nodes(G, X=origin[1], Y=origin[0])
        d = ox.nearest_nodes(G, X=dest[1],  Y=dest[0])
    except Exception as e:
        print(f"[{mode}] 최근접 노드 탐색 실패: {e}")
        return

    # 거리 기준
    try:
        route_dist = nx.shortest_path(G, o, d, weight="length")
        dist_m = _route_sum_attr(G, route_dist, "length")
        png1 = os.path.join(outdir, f"{mode}_route_distance.png")
        plot_and_save(G, route_dist, png1)
        print(f"[{mode}] distance≈{dist_m:.1f} m → {png1}")
    except nx.NetworkXNoPath:
        print(f"[{mode}] 경로 없음(거리 기준)")

    # 시간 기준
    add_travel_time(G, mode=mode)
    try:
        route_time = nx.shortest_path(G, o, d, weight="travel_time")
        t_sec = _route_sum_attr(G, route_time, "travel_time")
        png2 = os.path.join(outdir, f"{mode}_route_time.png")
        plot_and_save(G, route_time, png2)
        print(f"[{mode}] time≈{t_sec:.1f} s ({t_sec/60:.1f} min) → {png2}")
    except nx.NetworkXNoPath:
        print(f"[{mode}] 경로 없음(시간 기준)")

def main():
    print(f"Building graphs for modes: {MODES} | SMALL_TEST={SMALL_TEST} | "
          f"SIMPLIFY={SIMPLIFY} | RETAIN_ALL={RETAIN_ALL}")
    print(f"Cache folder: {ox.settings.cache_folder}")

    for mode in MODES:
        print(f"\n=== Building {mode} graph ===")
        G = build_graph(mode)
        print(f"[{mode}] nodes={G.number_of_nodes():,}, edges={G.number_of_edges():,}")

        graphml, gpkg = save_graph(G, mode)
        print(f"[{mode}] saved GraphML: {graphml}")
        print(f"[{mode}] saved GPKG:    {gpkg}")

        shortest_routes_and_plots(G, mode)

    print("\nAll done. Saved to:", os.path.abspath(OUTDIR))

if __name__ == "__main__":
    main()