// src/services/promise.service.mock.ts
import type { PromiseDetail } from "@/types/promise";

export const MOCK_DB: Record<string, PromiseDetail> = {
  "demo-1": {
    id: "demo-1",
    title: "신촌에서 약속",
    dday: 1, // 내일
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

  "demo-2": {
    id: "demo-2",
    title: "지난 주 모임 회고",
    dday: -2, // 이틀 지남
    participants: [
      { id: "p10", name: "민수", avatarUrl: "https://i.pravatar.cc/40?img=10" },
      { id: "p11", name: "지영", avatarUrl: "https://i.pravatar.cc/40?img=11" },
      { id: "p12", name: "수현", avatarUrl: "https://i.pravatar.cc/40?img=12" },
    ],
    schedule: { dateISO: "2025-10-24T00:00:00+09:00" },
    place: { name: "강남역", address: "서울 강남구 테헤란로" },
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

  "demo-3": {
    id: "demo-3",
    title: "오늘의 보드게임 번개",
    dday: 0, // 오늘
    participants: [
      { id: "p13", name: "철수", avatarUrl: "https://i.pravatar.cc/40?img=13" },
      { id: "p14", name: "영희", avatarUrl: "https://i.pravatar.cc/40?img=14" },
      { id: "p15", name: "현우", avatarUrl: "https://i.pravatar.cc/40?img=15" },
      { id: "p16", name: "지수", avatarUrl: "https://i.pravatar.cc/40?img=16" },
    ],
    schedule: { dateISO: "2025-10-26T00:00:00+09:00" },
    // place 없음 케이스 (optional)
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

  "demo-4": {
    id: "demo-4",
    title: "연말 정산 및 송년회 장소 사전 답사 모임",
    dday: 7,
    participants: [
      { id: "p17", name: "A", avatarUrl: "https://i.pravatar.cc/40?img=17" },
      { id: "p18", name: "B", avatarUrl: "https://i.pravatar.cc/40?img=18" },
      { id: "p19", name: "C", avatarUrl: "https://i.pravatar.cc/40?img=19" },
      { id: "p20", name: "D", avatarUrl: "https://i.pravatar.cc/40?img=20" },
      { id: "p21", name: "E", avatarUrl: "https://i.pravatar.cc/40?img=21" },
      { id: "p22", name: "F", avatarUrl: "https://i.pravatar.cc/40?img=22" },
      { id: "p23", name: "G", avatarUrl: "https://i.pravatar.cc/40?img=23" },
      { id: "p24", name: "H", avatarUrl: "https://i.pravatar.cc/40?img=24" },
      { id: "p25", name: "I", avatarUrl: "https://i.pravatar.cc/40?img=25" },
      { id: "p26", name: "J", avatarUrl: "https://i.pravatar.cc/40?img=26" },
      { id: "p27", name: "K", avatarUrl: "https://i.pravatar.cc/40?img=27" },
      { id: "p28", name: "L", avatarUrl: "https://i.pravatar.cc/40?img=28" },
    ],
    schedule: { dateISO: "2025-11-02T00:00:00+09:00" },
    place: { name: "연남동", address: "서울 마포구 연희로" },
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

  "demo-5": {
    id: "demo-5",
    title: "주말 등산 모임",
    // NOTE: 런타임에서 calcDdayFromISO로 보정되도록 빈 값으로 둠
    dday: undefined as unknown as number,
    participants: [
      { id: "p29", name: "태현", avatarUrl: "https://i.pravatar.cc/40?img=29" },
      { id: "p30", name: "가을", avatarUrl: "https://i.pravatar.cc/40?img=30" },
      { id: "p31", name: "다온", avatarUrl: "https://i.pravatar.cc/40?img=31" },
    ],
    schedule: { dateISO: "2025-11-09T00:00:00+09:00" }, // 일주일 뒤 일요일
    place: { name: "북한산 입구", address: "서울 은평구 대서문길" },
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

// dday가 없을 때만 schedule.dateISO 기준으로 보정
function calcDdayFromISO(iso?: string): number {
  if (!iso) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export async function getPromiseList(): Promise<PromiseDetail[]> {
  await delay(200);
  return Object.values(MOCK_DB).map((d) => ({
    ...d,
    dday:
      typeof d.dday === "number"
        ? d.dday
        : calcDdayFromISO(d.schedule?.dateISO),
  }));
}

export async function getPromiseDetail(
  promiseId: string
): Promise<PromiseDetail> {
  await delay(400); // UX 확인용
  const item = MOCK_DB[promiseId];
  if (!item) throw new Error("Mock 데이터에 해당 약속이 없습니다.");
  return item;
}

/**
 * ✅ 약속 저장 (Mock 버전)
 * - 실제로는 메모리 상의 MOCK_DB를 업데이트
 */
export async function savePromiseDetail(
  detail: PromiseDetail
): Promise<PromiseDetail> {
  await delay(200);
  MOCK_DB[detail.id] = {
    ...detail,
  };
  return MOCK_DB[detail.id];
}
