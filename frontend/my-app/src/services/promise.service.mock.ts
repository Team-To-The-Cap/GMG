import type { PromiseDetail } from "@/types/promise";

const MOCK_DB: Record<string, PromiseDetail> = {
  "demo-1": {
    id: "demo-1",
    title: "신촌에서 약속",
    ddayLabel: "D-1",
    participants: [
      { id: "p1", name: "라이언", avatarUrl: "https://i.pravatar.cc/40?img=1" },
      { id: "p2", name: "어피치", avatarUrl: "https://i.pravatar.cc/40?img=2" },
      { id: "p3", name: "네오", avatarUrl: "https://i.pravatar.cc/40?img=3" },
      { id: "p4", name: "무지", avatarUrl: "https://i.pravatar.cc/40?img=4" },
    ],
    schedule: { dateISO: "2025-10-27T00:00:00+09:00" },
    course: { text: "코스 요약 영역 (신촌역 → 연남동 카페 → 홍대 맛집)" },
  },
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getPromiseDetail(
  promiseId: string
): Promise<PromiseDetail> {
  await delay(400); // 로딩 UX 확인용
  const item = MOCK_DB[promiseId];
  if (!item) throw new Error("Mock 데이터에 해당 약속이 없습니다.");
  return item;
}
