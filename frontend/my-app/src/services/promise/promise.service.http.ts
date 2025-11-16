// src/services/promise.service.http.ts
import { http } from "@/lib/http";
import type { PromiseDetail } from "@/types/promise";

// 백엔드 Meeting 응답 형태 (Swagger 기준)
type MeetingResponse = {
  id: number;
  name: string;
  participants: Array<{
    id: number;
    name: string;
    // 백엔드에 프로필 이미지 필드가 있으면 여기에 추가
    avatar_url?: string | null;
  }>;
};

/**
 * Meeting 1건을 PromiseDetail로 변환하는 헬퍼
 */
function mapMeetingToPromiseDetail(meeting: MeetingResponse): PromiseDetail {
  const participants = meeting.participants.map((p) => ({
    id: String(p.id),
    name: p.name,
    avatarUrl: p.avatar_url || `https://i.pravatar.cc/40?u=${p.id}`,
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

  return {
    id: String(meeting.id),
    title: meeting.name,
    dday,
    participants,
    schedule: { dateISO: scheduleISO },
    course: {
      title: "임시 코스",
      summary: {
        totalMinutes: 0,
        activityMinutes: 0,
        travelMinutes: 0,
      },
      items: [],
      source: "from-meeting-http",
    },
  };
}

/**
 * 🔹 약속 상세 조회
 * - FastAPI: GET /meetings/{meeting_id}
 */
export async function getPromiseDetail(
  promiseId: string
): Promise<PromiseDetail> {
  const meetingId = Number(promiseId);
  if (Number.isNaN(meetingId)) {
    throw new Error(`잘못된 meeting id: ${promiseId}`);
  }

  const meeting = await http.request<MeetingResponse>(`/meetings/${meetingId}`);
  return mapMeetingToPromiseDetail(meeting);
}

/**
 * 🔹 약속 리스트 조회
 * - FastAPI: GET /meetings/
 */
export async function getPromiseList(): Promise<PromiseDetail[]> {
  const meetings = await http.request<MeetingResponse[]>("/meetings/");
  return meetings.map(mapMeetingToPromiseDetail);
}

/**
 * 🔹 약속 저장 (HTTP 버전)
 * - 현재 Meeting에 대한 업데이트 API가 명확하지 않아서,
 *   예시로 name만 PATCH 하는 식으로 둠.
 *   실제 스펙에 맞게 바꿔도 됨.
 */
export async function savePromiseDetail(
  detail: PromiseDetail
): Promise<PromiseDetail> {
  const meetingId = Number(detail.id);
  if (Number.isNaN(meetingId)) {
    throw new Error(`잘못된 meeting id: ${detail.id}`);
  }

  // 일단 name만 업데이트하는 예시
  await http.request(`/meetings/${meetingId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: detail.title }),
  });

  // 서버에서 업데이트된 Meeting을 다시 받아서 매핑하는 게 베스트지만,
  // 지금은 detail 그대로 돌려줘도 UI 입장에서는 충분함
  return detail;
}

/**
 * 🔹 빈 약속 하나 생성
 * - FastAPI: POST /meetings/
 * - body: { "name": "string" }
 */
export async function createEmptyPromise(): Promise<PromiseDetail> {
  const meeting = await http.request<MeetingResponse>("/meetings/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "" }),
  });

  // 방금 만든 meeting을 PromiseDetail로 변환
  return mapMeetingToPromiseDetail(meeting);
}

/**
 * 🔹 약속 삭제 (HTTP 버전)
 * - FastAPI: DELETE /meetings/{meeting_id}
 * - 성공 시 204 No Content
 */
export async function deletePromise(promiseId: string): Promise<void> {
  const meetingId = Number(promiseId);
  if (Number.isNaN(meetingId)) {
    throw new Error(`잘못된 meeting id: ${promiseId}`);
  }

  await http.request<void>(`/meetings/${meetingId}`, {
    method: "DELETE",
  });
}
