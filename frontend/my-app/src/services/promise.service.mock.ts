import type { PromiseDetail } from "@/types/promise";

const MOCK_DB: Record<string, PromiseDetail> = {
  "demo-1": {
    id: "demo-1",
    title: "신촌에서 약속",
    dday: 1,
    participants: [
      { id: "p1", name: "라이언", avatarUrl: "https://i.pravatar.cc/40?img=1" },
      { id: "p2", name: "어피치", avatarUrl: "https://i.pravatar.cc/40?img=2" },
      { id: "p3", name: "네오", avatarUrl: "https://i.pravatar.cc/40?img=3" },
      { id: "p4", name: "무지", avatarUrl: "https://i.pravatar.cc/40?img=4" },
      { id: "p5", name: "프로도", avatarUrl: "https://i.pravatar.cc/40?img=5" },
      { id: "p6", name: "튜브", avatarUrl: "https://i.pravatar.cc/40?img=6" },
    ],
    schedule: { dateISO: "2025-10-27T00:00:00+09:00" },

    course: {
      title: "추천 코스",
      summary: {
        totalMinutes: 195,
        activityMinutes: 180,
        travelMinutes: 15,
      },
      items: [
        {
          type: "visit",
          id: "v1",
          place: {
            name: "소공동 파스타 하우스",
            category: "restaurant",
            iconUrl: "/icons/food.png",
          },
          stayMinutes: 90,
        },
        {
          type: "transfer",
          mode: "walk",
          minutes: 5,
        },
        {
          type: "visit",
          id: "v2",
          place: {
            name: "블루보틀 명동점",
            category: "cafe",
            iconUrl: "/icons/cafe.png",
          },
          stayMinutes: 60,
        },
        {
          type: "transfer",
          mode: "walk",
          minutes: 8,
        },
        {
          type: "visit",
          id: "v3",
          place: {
            name: "텐바이텐 명동점",
            category: "shop",
            iconUrl: "/icons/shop.png",
          },
          stayMinutes: 45,
        },
      ],
      generatedAtISO: "2025-10-26T18:00:00+09:00",
      source: "mock-auto",
    },
  },
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getPromiseDetail(
  promiseId: string
): Promise<PromiseDetail> {
  await delay(400); // UX 확인용
  const item = MOCK_DB[promiseId];
  if (!item) throw new Error("Mock 데이터에 해당 약속이 없습니다.");
  return item;
}
