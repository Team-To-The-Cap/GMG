import type { PromiseDetail } from "@/types/promise";


export const MOCK_DB: Record<string, PromiseDetail> = {
  "demo-1": {
    id: "demo-1",
    title: "신촌에서 약속",
    dday: 1, // 내일
    participants: [
      { id: "p1", name: "라이언",  avatarUrl: "https://i.pravatar.cc/40?img=1" },
      { id: "p2", name: "어피치",  avatarUrl: "https://i.pravatar.cc/40?img=2" },
      { id: "p3", name: "네오",    avatarUrl: "https://i.pravatar.cc/40?img=3" },
      { id: "p4", name: "무지",    avatarUrl: "https://i.pravatar.cc/40?img=4" },
      { id: "p5", name: "튜브",    avatarUrl: "https://i.pravatar.cc/40?img=5" },
      { id: "p6", name: "프로도",  avatarUrl: "https://i.pravatar.cc/40?img=6" },
      { id: "p7", name: "콘",      avatarUrl: "https://i.pravatar.cc/40?img=7" },
      { id: "p8", name: "제이지",  avatarUrl: "https://i.pravatar.cc/40?img=8" },
      { id: "p9", name: "춘식이",  avatarUrl: "https://i.pravatar.cc/40?img=9" },
    ],
    schedule: { dateISO: "2025-10-27T00:00:00+09:00" },
    place: { name: "신촌역", address: "서울 서대문구 연세로" },
    course: { text: "신촌역 → 연남동 카페 → 홍대 맛집" },
  },

  // 과거 일정 (D+2 같은 케이스 UI용)
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
    course: { text: "회사 근처 식당 → 카페 → 귀가" },
  },

  // 오늘 일정 (D-Day)
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
    course: { text: "신분당선 라인 근처로 추후 확정" },
  },

  // 미래 일정 (일주일 후) + 긴 제목 + 참가자 많음
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
    course: { text: "연남동 산책 → 핫플 카페 → 예약 식당" },
  },

  // dday를 계산 로직으로 보정하고 싶다면: 아래처럼 타입 단언으로 의도적으로 비워둘 수도 있음
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
    course: { text: "등산 초입 → 전망대 → 하산 후 맛집" },
  },
};
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));



// dday가 없을 때만 schedule.dateISO 기준으로 보정
function calcDdayFromISO(iso?: string): number {
  if (!iso) return 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(iso); target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export async function getPromiseList(): Promise<PromiseDetail[]> {
  await delay(200);
  return Object.values(MOCK_DB).map((d) => ({
    ...d,
    dday: typeof d.dday === "number" ? d.dday : calcDdayFromISO(d.schedule?.dateISO),
  }));
}

export async function getPromiseDetail(
  promiseId: string
): Promise<PromiseDetail> {
  await delay(400); // 로딩 UX 확인용
  const item = MOCK_DB[promiseId];
  if (!item) throw new Error("Mock 데이터에 해당 약속이 없습니다.");
  return item;
}
