// src/services/promise/promise.service.http.ts
import { DRAFT_PROMISE_ID_KEY } from "@/assets/constants/storage";
import { http } from "@/lib/http";
import type {
  PromiseDetail,
  CourseVisit,
  CourseTransfer,
  Course,
} from "@/types/promise";
import type { Participant, ParticipantTime } from "@/types/participant";
import type {
  MeetingPlace,
  MeetingPlan,
  MeetingResponse,
} from "@/types/meeting";

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
        mode: "subway", // 기본값
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

  // 🔹 Must-Visit Place 매핑
  const mustVisitPlaces =
    (meeting.must_visit_places ?? []).map((p) => ({
      id: String(p.id),
      name: p.name,
      address: p.address ?? undefined,
    })) ?? [];

  return {
    id: String(meeting.id),
    title: meeting.name,
    dday,
    schedule: scheduleISO ? { dateISO: scheduleISO } : undefined,
    participants,
    place: primaryPlace,
    course,
    plan: meeting.plan, // MeetingResponse.plan 그대로 실어보내기 (available_dates 포함)

    // ⬇️ 새 필드
    mustVisitPlaces,
  } as PromiseDetail;
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
 */
export async function savePromiseDetail(
  detail: PromiseDetail
): Promise<PromiseDetail> {
  const meetingId = Number(detail.id);
  if (Number.isNaN(meetingId)) {
    throw new Error(`잘못된 meeting id: ${detail.id}`);
  }

  await http.request(`/meetings/${meetingId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: detail.title }),
  });

  return detail;
}

/**
 * 🔹 빈 약속 하나 생성
 */
export async function createEmptyPromise(): Promise<PromiseDetail> {
  const meeting = await http.request<MeetingResponse>("/meetings/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "" }),
  });

  return mapMeetingToPromiseDetail(meeting);
}

/**
 * 🔹 약속 삭제
 */
export async function deletePromise(promiseId: string): Promise<void> {
  const meetingId = Number(promiseId);

  if (Number.isNaN(meetingId)) {
    throw new Error(`잘못된 meeting id: ${promiseId}`);
  }

  await http.request<void>(`/meetings/${meetingId}`, {
    method: "DELETE",
  });

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
export async function calculateAutoPlan(
  promiseId: string
): Promise<PromiseDetail> {
  const meetingId = Number(promiseId);
  if (Number.isNaN(meetingId)) {
    throw new Error(`잘못된 meeting id: ${promiseId}`);
  }

  await http.request<MeetingPlan>(`/meetings/${meetingId}/plans/calculate`, {
    method: "POST",
  });

  const meeting = await http.request<MeetingResponse>(`/meetings/${meetingId}`);
  return mapMeetingToPromiseDetail(meeting);
}

// 🔹 약속 이름만 수정 (HTTP 버전)
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

// 🔹 약속 전체 초기화
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
      participants.map((p) => deleteParticipant(meetingId, p.id))
    );
  }

  // 2) 플랜 비우기
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
    body: JSON.stringify([]),
  });

  // 4) 약속 이름 비우기
  await http.request(`/meetings/${meetingId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "" }),
  });

  const meeting = await http.request<MeetingResponse>(`/meetings/${meetingId}`);
  return mapMeetingToPromiseDetail(meeting);
}

// 🔹 반드시 가고 싶은 장소 추가
// FastAPI: POST /api/meetings/{meeting_id}/must-visit-places/
export async function addMustVisitPlace(
  promiseId: string | number,
  payload: { name: string; address?: string }
): Promise<void> {
  const mid = Number(promiseId);
  if (Number.isNaN(mid)) {
    throw new Error(`잘못된 meeting id: ${promiseId}`);
  }

  await http.request(`/meetings/${mid}/must-visit-places/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: payload.name,
      address: payload.address ?? "",
    }),
  });
}

// 🔹 반드시 가고 싶은 장소 삭제
// FastAPI: DELETE /api/meetings/{meeting_id}/must-visit-places/{place_id}`
export async function deleteMustVisitPlace(
  promiseId: string | number,
  placeId: string | number
): Promise<void> {
  const mid = Number(promiseId);
  const pid = Number(placeId);

  if (Number.isNaN(mid) || Number.isNaN(pid)) {
    throw new Error(
      `잘못된 id (meeting: ${promiseId}, mustVisitPlace: ${placeId})`
    );
  }

  await http.request(`/meetings/${mid}/must-visit-places/${pid}`, {
    method: "DELETE",
  });
}
// 🔹 약속에 연결된 장소(코스 장소) 목록 조회
export async function getMeetingPlaces(
  promiseId: string | number
): Promise<MeetingPlace[]> {
  const mid = Number(promiseId);
  if (Number.isNaN(mid)) {
    throw new Error(`잘못된 meeting id: ${promiseId}`);
  }

  const places = await http.request<MeetingPlace[]>(`/meetings/${mid}/places`);
  return places;
}

// 🔹 선택한 장소를 MeetingPlan의 확정 장소로 반영
export async function setMeetingFinalPlace(
  promiseId: string | number,
  payload: { address: string; lat: number; lng: number }
): Promise<void> {
  const mid = Number(promiseId);
  if (Number.isNaN(mid)) {
    throw new Error(`잘못된 meeting id: ${promiseId}`);
  }

  await http.request(`/meetings/${mid}/plans`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address: payload.address,
      latitude: payload.lat,
      longitude: payload.lng,
      // meeting_time, total_time 등은 건드리지 않으면 기존 값 유지
    }),
  });
}
