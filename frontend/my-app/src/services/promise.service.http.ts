// src/services/promise.service.http.ts
import { http } from "@/lib/http";
import type { PromiseDetail } from "@/types/promise";
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
    avatarUrl: p.avatarUrl || `https://i.pravatar.cc/40?u=${p.id}`,
  }));

  const now = new Date();
  const scheduleISO = now.toISOString();

  // dday 임시 계산 (오늘 기준)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(scheduleISO);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  const dday = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // TODO: 실제 약속 상세 API가 생기면 title/dday/schedule/course를 서버 값으로 교체
  const detail: PromiseDetail = {
    id: promiseId,
    title: "서버 데이터 기반 약속",
    dday,
    participants: normalized,
    schedule: { dateISO: scheduleISO },
    course: {
      title: "임시 코스",
      summary: {
        totalMinutes: 0,
        activityMinutes: 0,
        travelMinutes: 0,
      },
      items: [],
      source: "http-mock",
    },
  };

  return detail;
}

export async function getPromiseList(): Promise<PromiseDetail[]> {
  try {
    return await http.request<PromiseDetail[]>("/promises");
  } catch {
    // 임시 폴백: participants만 있을 때 한 개짜리 Detail 구성
    const participants = await http.request<
      Array<{ id: string; name: string; avatarUrl?: string }>
    >("/participants/");
    const normalized = participants.map((p) => ({
      id: String(p.id),
      name: p.name,
      avatarUrl: p.avatarUrl || `https://i.pravatar.cc/40?u=${p.id}`,
    }));

    const now = new Date();
    const scheduleISO = now.toISOString();

    return [
      {
        id: "participants-aggregate",
        title: "서버 데이터 기반 약속(임시)",
        dday: 0,
        participants: normalized,
        schedule: { dateISO: scheduleISO },
        course: {
          title: "임시 코스",
          summary: {
            totalMinutes: 0,
            activityMinutes: 0,
            travelMinutes: 0,
          },
          items: [],
          source: "http-mock",
        },
      },
    ];
  }
}

/**
 * ✅ 약속 저장 (HTTP 버전)
 * 실제 서버 API 스펙에 맞게 method/url/body는 나중에 조정해도 됨.
 */
export async function savePromiseDetail(
  detail: PromiseDetail
): Promise<PromiseDetail> {
  await http.request<PromiseDetail>(`/promises/${detail.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(detail),
  });

  return detail;
}

/**
 * ✅ 빈 약속 하나 생성 (실서버용)
 * - 여기서는 schedule을 보내지 않고, id/schedule 등은 서버가 채워주도록 맡김
 */
export async function createEmptyPromise(): Promise<PromiseDetail> {
  // 서버에 실제로는 필요한 필드만 보내면 됨
  const payload: Partial<PromiseDetail> = {
    title: "",
    participants: [],
    // schedule은 보내지 않음 (서버가 기본값을 채움)
    // course도 서버에서 기본값을 갖게 할 수 있음; 필요하면 아래처럼 보내도 됨
    // course: {
    //   title: "추천 코스",
    //   summary: {
    //     totalMinutes: 0,
    //     activityMinutes: 0,
    //     travelMinutes: 0,
    //   },
    //   items: [],
    //   source: "auto",
    // },
  };

  const created = await http.request<PromiseDetail>("/promises", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  // created 안에 서버가 생성한 id, schedule 등이 들어있다고 가정
  return created;
}
