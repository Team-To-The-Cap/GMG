# pip install osmnx==1.9.3
import osmnx as ox
import networkx as nx
import matplotlib.pyplot as plt

# ---- OSMnx 기본 설정 ----
ox.settings.log_console = True
ox.settings.use_cache = True
ox.settings.timeout = 180

# ---- 빠른 테스트용: 서울시청 주변 반경 2km (아래 True를 False로 바꾸면 서울 전체) ----
SMALL_TEST = True

if SMALL_TEST:
    center = (37.5665, 126.9780)  # 서울시청
    G = ox.graph_from_point(center, dist=2000, network_type="drive")
else:
    G = ox.graph_from_place("Seoul, South Korea", network_type="drive")

print(f"[GRAPH] nodes={G.number_of_nodes()} edges={G.number_of_edges()}")

# ---- 출발/도착 좌표 ----
origin = (37.5665, 126.9780)  # 서울시청
dest   = (37.5512, 126.9882)  # 남산타워 근처

# ---- 가장 가까운 노드 찾기 ----
orig_n = ox.nearest_nodes(G, X=origin[1], Y=origin[0])
dest_n = ox.nearest_nodes(G, X=dest[1],  Y=dest[0])

# ---- (1) 거리 기준 최단 경로 ----
route_dist = nx.shortest_path(G, orig_n, dest_n, weight="length")
route_len_m = sum(G[u][v][k].get("length", 0.0) for u, v, k in zip(route_dist[:-1], route_dist[1:], [0]* (len(route_dist)-1)))
print(f"[ROUTE distance] nodes={len(route_dist)} total_length≈{route_len_m:.1f} m")

# ---- (2) 시간 기준 최단 경로 (travel_time 추가) ----
speed_kph_default = {
    "motorway": 90, "trunk": 80, "primary": 60, "secondary": 50,
    "tertiary": 40, "residential": 30, "unclassified": 30, "service": 20
}

def parse_speed_kph(edge_data):
    # highway 타입
    hwy = edge_data.get("highway")
    if isinstance(hwy, list): hwy = hwy[0]
    # maxspeed 값 파싱 (예: "50", "50 km/h", ["50"])
    spd = edge_data.get("maxspeed")
    if isinstance(spd, list) and spd: spd = spd[0]
    if spd is None:
        return speed_kph_default.get(hwy, 40)
    try:
        return float(str(spd).split()[0])
    except Exception:
        return speed_kph_default.get(hwy, 40)

for u, v, k, data in G.edges(keys=True, data=True):
    length_m = data.get("length", 0.0) or 0.0
    kph = parse_speed_kph(data)
    data["travel_time"] = (length_m / 1000.0) / max(kph, 1e-6) * 3600.0  # 초

route_time = nx.shortest_path(G, orig_n, dest_n, weight="travel_time")
tt_sec = sum(G[u][v][k].get("travel_time", 0.0) for u, v, k in zip(route_time[:-1], route_time[1:], [0]* (len(route_time)-1)))
print(f"[ROUTE time]    nodes={len(route_time)} travel_time≈{tt_sec:.1f} s ({tt_sec/60:.1f} min)")

# ---- 시각화: 화면에도 띄우고, 파일로도 저장 ----
# 거리 기준
fig1, ax1 = ox.plot_graph_route(
    G, route_dist, node_size=0, route_linewidth=4, route_alpha=0.8,
    bgcolor="white", show=False, close=False
)
fig1.savefig("route_distance.png", dpi=200, bbox_inches="tight")
print("[PLOT] saved route_distance.png")

# 시간 기준
fig2, ax2 = ox.plot_graph_route(
    G, route_time, node_size=0, route_linewidth=4, route_alpha=0.8,
    bgcolor="white", show=False, close=False
)
fig2.savefig("route_time.png", dpi=200, bbox_inches="tight")
print("[PLOT] saved route_time.png")

# 화면 표시 (환경에 따라 창이 안 뜰 수 있으니, 위에서 png 저장도 함께 함)
plt.show()
