// src/services/promise.service.mock.ts
import type { MeetingPlace } from "@/types/meeting";
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

/**
 * ✅ Test mode용: 메모리 MOCK_DB에 빈 약속 추가하고 ID 반환
 * - 여기서는 클라이언트에서 id 직접 생성
 */
export async function createEmptyPromise(): Promise<PromiseDetail> {
  await delay(200);

  const id = `mock-${Date.now()}`;
  const now = new Date().toISOString();

  const detail: PromiseDetail = {
    id,
    title: "",
    // 새로 만든 약속은 일정 미정이니까 dday는 의미 없는 값으로 둔다
    dday: undefined as unknown as number,
    participants: [],
    // 일정 미정
    schedule: { dateISO: "" },
    course: {
      title: "추천 코스",
      summary: {
        totalMinutes: 0,
        activityMinutes: 0,
        travelMinutes: 0,
      },
      items: [],
      generatedAtISO: now,
      source: "mock-empty",
    },
  };

  MOCK_DB[id] = detail;
  return detail;
}

/**
 * 🔹 약속 삭제 (Mock 버전)
 */
export async function deletePromise(promiseId: string): Promise<void> {
  await delay(100);
  delete MOCK_DB[promiseId];
}

/**
 * 🔹 참여자 삭제 (Mock 버전)
 */
export async function deleteParticipant(
  promiseId: string,
  participantId: string
): Promise<void> {
  await delay(100);
  const item = MOCK_DB[promiseId];
  if (!item) return;

  item.participants = (item.participants ?? []).filter(
    (p) => p.id !== participantId
  );
}

/**
 * 🔹 자동 일정/장소/코스 계산 (Mock 버전)
 * - 실제 서버처럼 "계산 후 다시 조회된 결과"라고 생각하고
 *   MOCK_DB 안의 해당 약속을 적당히 업데이트한 뒤 반환
 */
export async function calculateAutoPlan(
  promiseId: string
): Promise<PromiseDetail> {
  await delay(300);

  const item = MOCK_DB[promiseId];
  if (!item) {
    throw new Error("Mock 데이터에 해당 약속이 없습니다.");
  }

  // 👉 1) 일정: 일주일 뒤로 맞춰주는 예시
  const now = new Date();
  const nextWeek = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  // 👉 2) 장소: 없으면 임시 장소 하나 넣어줌
  const place =
    item.place ??
    ({
      name: "모임 장소 (mock 계산)",
      address: "서울 어딘가",
    } as PromiseDetail["place"]);

  // 👉 3) 코스 요약: 그냥 예시 값으로 채우기
  const updated: PromiseDetail = {
    ...item,
    schedule: { dateISO: nextWeek },
    place,
    course: {
      ...item.course,
      summary: {
        totalMinutes: 180,
        activityMinutes: 120,
        travelMinutes: 60,
      },
      source: "mock-calculate-plan",
    },
  };

  MOCK_DB[promiseId] = updated;
  return updated;
}

/**
 * 🔹 코스 자동 계산 (Mock 버전)
 * - 실제 서버에서는 MeetingPlace를 새로 만들고, 다시 Meeting을 조회하지만
 *   여기서는 단순히 코스 요약/타임라인만 살짝 바꿔서 리턴
 */
export async function calculateAutoCourse(
  promiseId: string
): Promise<PromiseDetail> {
  await delay(300);

  const item = MOCK_DB[promiseId];
  if (!item) {
    throw new Error("Mock 데이터에 해당 약속이 없습니다.");
  }

  // 코스를 살짝 바꾸는 예시 (실제 로직은 서버 버전에 맞춰 자유롭게 수정 가능)
  const now = new Date().toISOString();

  const updated: PromiseDetail = {
    ...item,
    course: {
      ...(item.course ?? {
        title: "추천 코스",
        summary: {
          totalMinutes: 0,
          activityMinutes: 0,
          travelMinutes: 0,
        },
        items: [],
      }),
      summary: {
        totalMinutes: 200,
        activityMinutes: 140,
        travelMinutes: 60,
      },
      generatedAtISO: now,
      source: "mock-calculate-course",
    },
  };

  MOCK_DB[promiseId] = updated;
  return updated;
}

/**
 * 🔹 약속 이름 수정 (Mock 버전)
 */
export async function updateMeetingName(
  promiseId: string,
  name: string
): Promise<void> {
  await delay(100);
  const item = MOCK_DB[promiseId];
  if (!item) {
    throw new Error("Mock 데이터에 해당 약속이 없습니다.");
  }
  item.title = name;
}

// 🔹 약속 전체 초기화 (Mock 버전)
// - 이름, 참가자, 일정, 장소, 코스 전부 비움
export async function resetPromiseOnServer(
  detail: PromiseDetail
): Promise<PromiseDetail> {
  await delay(200);

  const existing = MOCK_DB[detail.id];
  if (!existing) {
    throw new Error("Mock 데이터에 해당 약속이 없습니다.");
  }

  const now = new Date().toISOString();

  const cleared: PromiseDetail = {
    ...existing,
    title: "",
    participants: [],
    schedule: { dateISO: "" }, // 일정 미정
    place: undefined,
    mustVisitPlaces: [],
    course: {
      // 코스 구조는 유지하되 내용만 싹 비움
      ...(existing.course ?? {
        title: "추천 코스",
        summary: {
          totalMinutes: 0,
          activityMinutes: 0,
          travelMinutes: 0,
        },
        items: [],
      }),
      summary: {
        totalMinutes: 0,
        activityMinutes: 0,
        travelMinutes: 0,
      },
      items: [],
      generatedAtISO: now,
      source: "mock-reset",
    },
  };

  MOCK_DB[detail.id] = cleared;
  return cleared;
}

// 🔹 반드시 가고 싶은 장소 추가 (Mock 버전)
export async function addMustVisitPlace(
  promiseId: string,
  payload: { name: string; address?: string }
): Promise<void> {
  await delay(100);
  const item = MOCK_DB[promiseId];
  if (!item) return;

  const list = item.mustVisitPlaces ?? [];
  const id = `mv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  item.mustVisitPlaces = [
    ...list,
    {
      id,
      name: payload.name,
      address: payload.address,
    },
  ];
}

// 🔹 반드시 가고 싶은 장소 삭제 (Mock 버전)
export async function deleteMustVisitPlace(
  promiseId: string,
  placeId: string
): Promise<void> {
  await delay(100);
  const item = MOCK_DB[promiseId];
  if (!item || !item.mustVisitPlaces) return;

  item.mustVisitPlaces = item.mustVisitPlaces.filter((p) => p.id !== placeId);
}

// 🔹 약속에 연결된 장소(코스 장소) 목록 조회 (Mock 버전)
export async function getMeetingPlaces(
  promiseId: string
): Promise<MeetingPlace[]> {
  await delay(200);

  // 간단하게 약속 ID에 따라 고정된 mock 장소 몇 개 리턴
  const mid = Number(promiseId) || 0;

  return [
    {
      id: 1,
      meeting_id: mid,
      name: "강남역 2번 출구",
      latitude: 37.498,
      longitude: 127.028,
      address: "서울 강남구 강남대로 396",
      category: "activity",
      duration: 60,
    },
    {
      id: 2,
      meeting_id: mid,
      name: "신논현역 스타벅스",
      latitude: 37.504,
      longitude: 127.025,
      address: "서울 강남구 강남대로 536",
      category: "cafe",
      duration: 45,
    },
    {
      id: 3,
      meeting_id: mid,
      name: "역삼역 CGV",
      latitude: 37.5,
      longitude: 127.036,
      address: "서울 강남구 테헤란로 134",
      category: "activity",
      duration: 120,
    },
  ];
}

// 🔹 선택한 장소를 MeetingPlan의 확정 장소로 반영 (Mock 버전)
export async function setMeetingFinalPlace(
  promiseId: string,
  payload: { address: string; lat: number; lng: number }
): Promise<void> {
  await delay(100);
  const item = MOCK_DB[promiseId];
  if (!item) return;

  // PromiseDetail.place 필드에 반영
  item.place = {
    name: payload.address,
    address: payload.address,
    lat: payload.lat,
    lng: payload.lng,
  };
}
