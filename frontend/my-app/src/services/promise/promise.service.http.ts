// src/services/promise/promise.service.http.ts
import { DRAFT_PROMISE_ID_KEY } from "@/assets/constants/storage";
import { http } from "@/lib/http";
// src/services/promise/promise.service.http.ts
import type {
  PromiseDetail,
  CourseVisit,
  CourseTransfer,
  Course,
} from "@/types/promise";
import type { Participant, ParticipantTime } from "@/types/participant";
import type { MeetingPlan, MeetingResponse } from "@/types/meeting";

/**
 * 🔹 백엔드에서 내려주는 MeetingResponse.places 배열을
 *     PromiseDetail.course 구조로 변환해 주는 헬퍼
 */
function buildCourseFromPlaces(meeting: MeetingResponse): Course {
  const places = meeting.places ?? [];

  // 장소가 하나도 없으면 기본(빈) 코스 반환
  if (!places.length) {
    return {
      title: "코스 미정",
      summary: {
        totalMinutes: 0,
        activityMinutes: 0,
        travelMinutes: 0,
      },
      items: [],
      source: "from-meeting-http",
    };
  }

  const items: Array<CourseVisit | CourseTransfer> = [];
  let activityMinutes = 0;
  let travelMinutes = 0;

  places.forEach((pl, idx) => {
    // 🔹 (1) 이전 장소 → 현재 장소로의 이동 단계
    if (idx > 0) {
      const transferMinutes = 10; // TODO: 나중에 실제 이동시간 계산으로 교체 가능

      items.push({
        type: "transfer",
        mode: "subway", // 기본값 (walk/subway 등 마음대로 조정 가능)
        minutes: transferMinutes,
        note: "이동",
      });

      travelMinutes += transferMinutes;
    }

    // 🔹 (2) 현재 장소 방문 단계
    const stay = pl.duration ?? 60; // duration을 체류시간으로 사용

    items.push({
      type: "visit",
      id: String(pl.id),
      place: {
        name: pl.name,
        address: pl.address,
        lat: pl.latitude,
        lng: pl.longitude,
        category: (pl as any).category ?? "activity",
      },
      stayMinutes: stay,
      note: pl.address,
    });

    activityMinutes += stay;
  });

  return {
    title: meeting.name || "추천 코스",
    summary: {
      totalMinutes: activityMinutes + travelMinutes,
      activityMinutes,
      travelMinutes,
    },
    items,
    generatedAtISO: new Date().toISOString(),
    source: "auto-from-backend-places",
  };
}

/**
 * 🔹 MeetingResponse -> PromiseDetail 매핑
 */
function mapMeetingToPromiseDetail(meeting: MeetingResponse): PromiseDetail {
  const participants: Participant[] = meeting.participants.map((raw) => {
    const p: any = raw;

    const fav: string = p.fav_activity ?? "";
    const preferredCategories =
      fav.length > 0
        ? fav
            .split(",")
            .map((s: string) => s.trim())
            .filter((s: string) => !!s)
        : [];

    const availableTimes: ParticipantTime[] = (p.available_times ?? []).map(
      (t: any) => ({
        start_time: t.start_time as string,
        end_time: t.end_time as string,
      })
    );

    return {
      id: String(p.id),
      name: p.name,
      avatarUrl: p.avatar_url || `https://i.pravatar.cc/40?u=${p.id}`,
      startAddress: p.start_address as string | undefined,
      transportation: p.transportation as string | undefined,
      favActivityRaw: fav,
      preferredCategories,
      availableTimes,
    };
  });

  const scheduleISO = meeting.plan?.meeting_time ?? null;

  let dday: number | null = null;
  if (scheduleISO) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(scheduleISO);
    target.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - today.getTime();
    dday = Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  const primaryPlace =
    meeting.plan?.address && meeting.plan.address.trim()
      ? {
          name: meeting.plan.address,
          address: meeting.plan.address,
          lat: meeting.plan.latitude ?? undefined,
          lng: meeting.plan.longitude ?? undefined,
        }
      : meeting.places && meeting.places.length > 0
      ? {
          name: meeting.places[0].name,
          address: meeting.places[0].address,
          lat: meeting.places[0].latitude,
          lng: meeting.places[0].longitude,
        }
      : undefined;

  const course = buildCourseFromPlaces(meeting);

  return {
    id: String(meeting.id),
    title: meeting.name,
    dday,
    schedule: scheduleISO ? { dateISO: scheduleISO } : undefined,
    participants,
    place: primaryPlace,
    course,

    // ⬇⬇⬇ 이 줄 추가
    plan: meeting.plan, // MeetingResponse.plan 그대로 실어보내기 (available_dates 포함)
  } as any; // PromiseDetail 타입에 plan 없으면 ts 무시용
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

  // 실제론 서버에서 다시 조회하는 게 best지만,
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
 * 🔹 약속 삭제
 * - FastAPI: DELETE /meetings/{meeting_id}
 * - 성공 시 204 No Content
 */
export async function deletePromise(promiseId: string): Promise<void> {
  const meetingId = Number(promiseId);

  if (Number.isNaN(meetingId)) {
    throw new Error(`잘못된 meeting id: ${promiseId}`);
  }

  // 실제 삭제 요청
  await http.request<void>(`/meetings/${meetingId}`, {
    method: "DELETE",
  });

  // 🔥 삭제된 meeting ID가 draft로 저장된 ID라면 제거
  const storedDraftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);

  if (storedDraftId && storedDraftId === String(meetingId)) {
    console.log("[deletePromise] Draft ID 제거됨:", storedDraftId);
    localStorage.removeItem(DRAFT_PROMISE_ID_KEY);
  }
}

// 🔹 참여자 삭제 (HTTP 버전)
export async function deleteParticipant(
  meetingId: string | number,
  participantId: string | number
): Promise<void> {
  const mid = Number(meetingId);
  const pid = Number(participantId);

  if (Number.isNaN(mid) || Number.isNaN(pid)) {
    throw new Error(
      `잘못된 id (meeting: ${meetingId}, participant: ${participantId})`
    );
  }

  await http.request<void>(`/meetings/${mid}/participants/${pid}`, {
    method: "DELETE",
  });
}

// 🔹 자동 일정/장소/코스 계산 (HTTP 버전)
// FastAPI: POST /meetings/{meeting_id}/plans/calculate
export async function calculateAutoPlan(
  promiseId: string
): Promise<PromiseDetail> {
  const meetingId = Number(promiseId);
  if (Number.isNaN(meetingId)) {
    throw new Error(`잘못된 meeting id: ${promiseId}`);
  }

  // 1) 계산 트리거
  await http.request<MeetingPlan>(`/meetings/${meetingId}/plans/calculate`, {
    method: "POST",
  });

  // 2) 새로 계산된 plan/places까지 포함해서 다시 조회
  const meeting = await http.request<MeetingResponse>(`/meetings/${meetingId}`);
  return mapMeetingToPromiseDetail(meeting);
}

// 🔹 약속 이름만 수정 (HTTP 버전)
// FastAPI: PATCH /meetings/{meeting_id}  { "name": "..." }
export async function updateMeetingName(
  meetingId: string | number,
  name: string
): Promise<void> {
  const mid = Number(meetingId);
  if (Number.isNaN(mid)) {
    throw new Error(`잘못된 meeting id: ${meetingId}`);
  }

  await http.request(`/meetings/${mid}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
}

// 🔹 약속 전체 초기화: 이름 / 참가자 / 일정 / 장소 / 코스 모두 비움
export async function resetPromiseOnServer(
  detail: PromiseDetail
): Promise<PromiseDetail> {
  const meetingId = Number(detail.id);
  if (Number.isNaN(meetingId)) {
    throw new Error(`잘못된 meeting id: ${detail.id}`);
  }

  // 1) 모든 참가자 삭제
  const participants = detail.participants ?? [];
  if (participants.length) {
    await Promise.all(
      participants.map(
        (p) => deleteParticipant(meetingId, p.id) // 이미 있는 함수 재사용
      )
    );
  }

  // 2) 플랜(일정/장소) 비우기
  // plan 자체가 null인 경우에는 PATCH에서 404 나올 수도 있으니 try/catch로 감싸고,
  // 404 정도는 무시해도 됨.
  try {
    await http.request(`/meetings/${meetingId}/plans`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meeting_time: null,
        address: "",
        latitude: null,
        longitude: null,
        total_time: null,
        available_dates: [] as any[],
      }),
    });
  } catch (e) {
    console.warn("resetPromiseOnServer: plan reset 실패 (무시 가능)", e);
  }

  // 3) 장소(코스) 비우기
  await http.request(`/meetings/${meetingId}/places`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify([]), // 장소 0개로 교체
  });

  // 4) 약속 이름 비우기
  await http.request(`/meetings/${meetingId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "" }),
  });

  // 5) 최종 상태 다시 조회해서 PromiseDetail로 변환
  const meeting = await http.request<MeetingResponse>(`/meetings/${meetingId}`);
  return mapMeetingToPromiseDetail(meeting);
}
