import osmnx as ox
import networkx as nx

# 1) 그래프 로드
G = ox.load_graphml("seoul_graph_out/drive.graphml")

# 2) 경로 질의 예시 (시청 → 남산타워)
origin = (37.5665, 126.9780)
dest   = (37.5512, 126.9882)
o = ox.nearest_nodes(G, X=origin[1], Y=origin[0])
d = ox.nearest_nodes(G, X=dest[1],  Y=dest[0])

# (a) 거리 기준
route_dist = nx.shortest_path(G, o, d, weight="length")

# (b) 시간 기준 (travel_time이 저장돼 있다면 그걸로, 없다면 먼저 생성)
if "travel_time" not in next(iter(G.edges(data=True)))[-1]:
    # 필요시 travel_time 만들기 (간단버전)
    defaults = {"motorway":90,"trunk":80,"primary":60,"secondary":50,
                "tertiary":40,"residential":30,"unclassified":30,"service":20}
    for u, v, k, data in G.edges(keys=True, data=True):
        hwy = data.get("highway")
        if isinstance(hwy, list): hwy = hwy[0]
        spd = data.get("maxspeed")
        if isinstance(spd, list): spd = spd[0]
        try: kph = float(str(spd).split()[0]) if spd else defaults.get(hwy,40)
        except: kph = defaults.get(hwy,40)
        L = float(data.get("length",0.0) or 0.0)
        data["travel_time"] = (L/1000)/max(kph,1e-6)*3600

route_time = nx.shortest_path(G, o, d, weight="travel_time")

# 3) 시각화/저장
fig, ax = ox.plot_graph_route(G, route_dist, node_size=0, show=False, close=False)
fig.savefig("route_from_graphml.png", dpi=200, bbox_inches="tight")
