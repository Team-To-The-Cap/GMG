// src/services/promise.service.http.ts
import { http } from "@/lib/http";
import type { PromiseDetail} from "@/types/promise";
import type { Participant } from "@/types/participant";

/**
 * 서버의 참가자 목록을 가져와 PromiseDetail 형태로 조립
 * - 현재 서버에 participants 엔드포인트만 있다고 가정
 * - title/dday/schedule/course 는 임시로 채움(실제 API 생기면 교체)
 */
export async function getPromiseDetail(
  promiseId: string
): Promise<PromiseDetail> {
  // 서버: GET {BASE_URL}/participants/
  const participants = await http.request<Participant[]>("/participants/");

  // 필요한 필드만 정규화
  const normalized = participants.map((p) => ({
    id: String(p.id),
    name: p.name,
    // avatarUrl 없으면 기본값으로 채움(서버에서 제공되면 그대로 사용)
    avatarUrl: p.avatarUrl || `https://i.pravatar.cc/40?u=${p.id}`,
  }));

  // TODO: 실제 약속 상세 API가 생기면 title/dday/schedule/course를 서버 값으로 교체
  const detail: PromiseDetail = {
    id: promiseId,
    title: "서버 데이터 기반 약속",
    dday: 2,
    participants: normalized,
    schedule: { dateISO: new Date().toISOString() },
    course: { text: "서버 participants를 사용해 구성한 약속 상세" },
  };

  return detail;
}


export async function getPromiseList(): Promise<PromiseDetail[]> {
  try {
    return await http.request<PromiseDetail[]>("/promises");
  } catch {
    // 임시 폴백: participants만 있을 때 한 개짜리 Detail 구성
    const participants = await http.request<Array<{ id: string; name: string; avatarUrl?: string }>>("/participants/");
    const normalized = participants.map((p) => ({
      id: String(p.id),
      name: p.name,
      avatarUrl: p.avatarUrl || `https://i.pravatar.cc/40?u=${p.id}`,
    }));
    return [
      {
        id: "participants-aggregate",
        title: "서버 데이터 기반 약속(임시)",
        dday: 0,
        participants: normalized,
        schedule: { dateISO: new Date().toISOString() },
        course: { text: "participants를 이용해 구성한 임시 상세" },
      },
    ];
  }
}