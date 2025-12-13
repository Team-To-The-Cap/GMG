// src/services/promise.service.http.ts
import { DRAFT_PROMISE_ID_KEY } from "@/assets/constants/storage";
import { http } from "@/lib/http";
import type {
  PromiseDetail,
  CourseVisit,
  CourseTransfer,
  Course,
  MeetingProfile,
} from "@/types/promise";
import type { Participant, ParticipantTime } from "@/types/participant";
import type {
  MeetingPlace,
  MeetingPlan,
  MeetingResponse,
} from "@/types/meeting";

/**
 * 🔹 Haversine 공식으로 두 지점 간의 직선 거리 계산 (미터 단위)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // 지구 반지름 (미터)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 🔹 보행 시간 계산 (거리 기반, naive)
 * - 보행 속도: 5 km/h = 약 83.3 m/min
 */
function calculateWalkingTime(
  startLat: number,
  startLng: number,
  goalLat: number,
  goalLng: number
): number {
  const distanceMeters = calculateDistance(startLat, startLng, goalLat, goalLng);
  const walkingSpeedMetersPerMinute = 83.3; // 5 km/h
  const minutes = distanceMeters / walkingSpeedMetersPerMinute;
  return Math.round(minutes);
}

/**
 * 🔹 참가자들의 이동 수단 정보를 기반으로 코스 이동 모드 결정
 * - 대중교통 사용자가 있으면 대중교통 우선
 * - 모두 자동차면 자동차
 * - 기본값: 대중교통
 */
function determineCourseTravelMode(participants: any[]): "driving" | "transit" {
  if (!participants || participants.length === 0) {
    return "transit"; // 기본값: 대중교통
  }

  // 참가자들의 이동 수단 카운트
  let transitCount = 0;
  let drivingCount = 0;

  for (const p of participants) {
    const transportation = (p.transportation || "").toLowerCase().trim();
    
    // 대중교통
    if (
      transportation === "대중교통" ||
      transportation === "transit" ||
      transportation === "public" ||
      transportation === "지하철" ||
      transportation === "버스"
    ) {
      transitCount++;
    }
    // 자동차
    else if (
      transportation === "자동차" ||
      transportation === "driving" ||
      transportation === "drive" ||
      transportation === "car" ||
      transportation === "차"
    ) {
      drivingCount++;
    }
    // 도보는 지원하지 않지만, 기본값으로 대중교통 카운트
    else {
      transitCount++;
    }
  }

  // 대중교통 사용자가 하나라도 있으면 대중교통 우선
  // (코스 이동은 모두가 함께 이동하므로 대중교통 사용자를 고려)
  return transitCount > 0 ? "transit" : "driving";
}

/**
 * 🔹 백엔드 MeetingResponse.places → 프론트 Course 구조로 변환
 * ✅ meeting_point 카테고리는 코스에서 제외 (일정/장소 계산 결과는 코스가 아님)
 * ✅ 실제 이동시간 계산 (참가자들의 이동 수단 정보 기반)
 */
async function buildCourseFromPlaces(
  meeting: MeetingResponse
): Promise<Course> {
  const allPlaces = meeting.places ?? [];

  // meeting_point 카테고리는 코스에서 제외 (일정/장소 계산 결과)
  const places = allPlaces.filter((pl: any) => pl.category !== "meeting_point");

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

  // 참가자들의 이동 수단 정보를 기반으로 코스 이동 모드 결정
  const baseTravelMode = determineCourseTravelMode(meeting.participants || []);

  const items: Array<CourseVisit | CourseTransfer> = [];
  let activityMinutes = 0;
  let travelMinutes = 0;

  for (let idx = 0; idx < places.length; idx++) {
    const pl = places[idx];

      // 이전 장소와의 이동시간 계산 (첫 번째 장소는 제외)
      if (idx > 0) {
        const prevPlace = places[idx - 1];
        try {
          // 도보 시간은 거리 기반으로 직접 계산
          const walkingMinutes = calculateWalkingTime(
            prevPlace.latitude,
            prevPlace.longitude,
            pl.latitude,
            pl.longitude
          );
          const walkingResult = {
            duration_seconds: walkingMinutes * 60,
            duration_minutes: walkingMinutes,
            mode: "walking",
            success: true,
            is_estimated: true,
          };

          // 대중교통, 자동차는 API로 계산
          const travelTimeResults = await Promise.allSettled([
            http.request<{
              duration_seconds: number;
              duration_minutes: number;
              mode: string;
              success: boolean;
              is_estimated?: boolean;
            }>(
              `/directions/travel-time?start_lat=${prevPlace.latitude}&start_lng=${prevPlace.longitude}&goal_lat=${pl.latitude}&goal_lng=${pl.longitude}&mode=transit`
            ).catch(() => null),
            http.request<{
              duration_seconds: number;
              duration_minutes: number;
              mode: string;
              success: boolean;
              is_estimated?: boolean;
            }>(
              `/directions/travel-time?start_lat=${prevPlace.latitude}&start_lng=${prevPlace.longitude}&goal_lat=${pl.latitude}&goal_lng=${pl.longitude}&mode=driving`
            ).catch(() => null),
          ]);

        // 성공한 결과만 추출
        const transitResult =
          travelTimeResults[0].status === "fulfilled" &&
          travelTimeResults[0].value?.success
            ? travelTimeResults[0].value
            : null;
        const drivingResult =
          travelTimeResults[1].status === "fulfilled" &&
          travelTimeResults[1].value?.success
            ? travelTimeResults[1].value
            : null;

        // 최적 이동 수단 결정
        let selectedResult:
          | {
              duration_seconds: number;
              duration_minutes: number;
              mode: string;
              success: boolean;
            }
          | null = null;
        let selectedModeLabel = "subway";

        // 도보, 대중교통, 자동차 중 최소 시간 찾기
        const availableResults = [
          walkingResult ? { ...walkingResult, mode: "walking" } : null,
          transitResult ? { ...transitResult, mode: "transit" } : null,
          drivingResult ? { ...drivingResult, mode: "driving" } : null,
        ].filter((r): r is NonNullable<typeof r> => r !== null);

        if (availableResults.length > 0) {
          // 최소 시간 찾기
          const minTimeResult = availableResults.reduce((min, current) =>
            current.duration_minutes < min.duration_minutes ? current : min
          );

          // 도보 시간이 다른 모드와 크게 차이 안 나면 도보 선택
          if (walkingResult) {
            const walkingMinutes = walkingResult.duration_minutes;
            const otherResults = availableResults.filter((r) => r.mode !== "walking");
            
            if (otherResults.length > 0) {
              const minOtherMinutes = Math.min(
                ...otherResults.map((r) => r.duration_minutes)
              );
              
              // 절대 차이가 15분 이내이면 도보 선택
              const isWalkingReasonable = walkingMinutes - minOtherMinutes <= 15;

              if (isWalkingReasonable) {
                selectedResult = {
                  ...walkingResult,
                  mode: "walking",
                };
                selectedModeLabel = "walk";
              } else {
                // 도보가 비합리적이면 원래 기준 모드 선택
                const baseResult =
                  baseTravelMode === "transit" ? transitResult : drivingResult;
                if (baseResult) {
                  selectedResult = {
                    ...baseResult,
                    mode: baseTravelMode,
                  };
                  selectedModeLabel = baseTravelMode === "transit" ? "subway" : "car";
                } else {
                  // 원래 모드 실패 시 최소 시간 모드 선택
                  selectedResult = minTimeResult;
                  selectedModeLabel =
                    minTimeResult.mode === "walking"
                      ? "walk"
                      : minTimeResult.mode === "transit"
                      ? "subway"
                      : "car";
                }
              }
            } else {
              // 도보만 성공한 경우
              selectedResult = {
                ...walkingResult,
                mode: "walking",
              };
              selectedModeLabel = "walk";
            }
          } else {
            // 도보 실패 시 원래 기준 모드 또는 최소 시간 모드
            const baseResult =
              baseTravelMode === "transit" ? transitResult : drivingResult;
            if (baseResult) {
              selectedResult = {
                ...baseResult,
                mode: baseTravelMode,
              };
              selectedModeLabel = baseTravelMode === "transit" ? "subway" : "car";
            } else {
              selectedResult = minTimeResult;
              selectedModeLabel =
                minTimeResult.mode === "transit" ? "subway" : "car";
            }
          }
        }

        if (selectedResult) {
          const transferMinutes = Math.round(selectedResult.duration_minutes);
          const modeNote =
            selectedModeLabel === "walk"
              ? "도보"
              : selectedModeLabel === "subway"
              ? "지하철/버스"
              : "자동차";
          
          items.push({
            type: "transfer",
            mode: selectedModeLabel,
            minutes: transferMinutes,
            note: modeNote,
          });
          travelMinutes += transferMinutes;
        } else {
          // 모든 모드 실패 시 기본값 사용 (10분)
          const transferMinutes = 10;
          items.push({
            type: "transfer",
            mode: baseTravelMode === "transit" ? "subway" : "car",
            minutes: transferMinutes,
            note: `${baseTravelMode === "transit" ? "대중교통" : "자동차"} (추정)`,
          });
          travelMinutes += transferMinutes;
        }
      } catch (error) {
        console.warn(
          `Failed to calculate travel time between places ${idx - 1} and ${idx}:`,
          error
        );
        // API 실패 시 기본값 사용 (10분)
        const transferMinutes = 10;
        items.push({
          type: "transfer",
          mode: baseTravelMode === "transit" ? "subway" : "car",
          minutes: transferMinutes,
          note: `${baseTravelMode === "transit" ? "대중교통" : "자동차"} (추정)`,
        });
        travelMinutes += transferMinutes;
      }
    }

    const stay = pl.duration ?? 60;
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
  }

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

/** 🔹 서버의 "a,b,c" 같은 string을 string[]로 파싱 */
function parseMultiField(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => !!s);
}

/** 🔹 프론트의 string | string[] 값을 백엔드용 string으로 직렬화 */
function serializeMultiField(val: unknown): string | null {
  if (Array.isArray(val)) {
    const arr = (val as string[]).map((s) => s.trim()).filter((s) => !!s);
    return arr.length ? arr.join(",") : null;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed || null;
  }
  return null;
}

/**
 * 🔹 MeetingResponse -> PromiseDetail 매핑 (비동기 버전, 실제 이동시간 계산 포함)
 */
async function mapMeetingToPromiseDetailAsync(meeting: MeetingResponse): Promise<PromiseDetail> {
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

    // 서브 카테고리 파싱
    let preferredSubcategories: any = {};
    if (p.fav_subcategories) {
      try {
        preferredSubcategories = JSON.parse(p.fav_subcategories);
      } catch (e) {
        console.warn("Failed to parse fav_subcategories:", e);
        preferredSubcategories = {};
      }
    }

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
      startLat: (p.start_latitude as number | undefined) ?? undefined,
      startLng: (p.start_longitude as number | undefined) ?? undefined,
      transportation: p.transportation as string | undefined,
      favActivityRaw: fav,
      preferredCategories,
      preferredSubcategories,
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

  const course = await buildCourseFromPlaces(meeting);

  const mustVisitPlaces =
    (meeting.must_visit_places ?? []).map((p) => ({
      id: String(p.id),
      name: p.name,
      address: p.address ?? undefined,
      // MeetingMustVisitPlace 타입에 lat/lng 있으면 여기서 같이 매핑 가능
      // lat: (p as any).latitude,
      // lng: (p as any).longitude,
    })) ?? [];

  const meetingProfile: MeetingProfile = {
    withWhom: meeting.with_whom ?? undefined,
    purpose: parseMultiField(meeting.purpose),
    vibe: parseMultiField(meeting.vibe) as any,
    budget: parseMultiField(meeting.budget),
  };

  return {
    id: String(meeting.id),
    title: meeting.name,
    dday,
    schedule: scheduleISO ? { dateISO: scheduleISO } : undefined,
    participants,
    place: primaryPlace,
    course,
    plan: meeting.plan as any,
    mustVisitPlaces,
    meetingProfile,
  } as PromiseDetail;
}

/**
 * 🔹 MeetingResponse -> PromiseDetail 매핑 (동기 버전, 이동시간 계산 없음)
 * @deprecated 실제 이동시간 계산이 필요하면 mapMeetingToPromiseDetailAsync 사용
 */
function mapMeetingToPromiseDetail(meeting: MeetingResponse): PromiseDetail {
  // 동기 버전에서는 코스를 나중에 계산하도록 빈 코스 반환
  const course: Course = {
    title: "코스 계산 필요",
    summary: {
      totalMinutes: 0,
      activityMinutes: 0,
      travelMinutes: 0,
    },
    items: [],
    source: "pending",
  };

  const mustVisitPlaces =
    (meeting.must_visit_places ?? []).map((p) => ({
      id: String(p.id),
      name: p.name,
      address: p.address ?? undefined,
    })) ?? [];

  const meetingProfile: MeetingProfile = {
    withWhom: meeting.with_whom ?? undefined,
    purpose: parseMultiField(meeting.purpose),
    vibe: parseMultiField(meeting.vibe) as any,
    budget: parseMultiField(meeting.budget),
  };

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
    let preferredSubcategories: any = {};
    if (p.fav_subcategories) {
      try {
        preferredSubcategories = JSON.parse(p.fav_subcategories);
      } catch (e) {
        console.warn("Failed to parse fav_subcategories:", e);
        preferredSubcategories = {};
      }
    }
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
      startLat: (p.start_latitude as number | undefined) ?? undefined,
      startLng: (p.start_longitude as number | undefined) ?? undefined,
      transportation: p.transportation as string | undefined,
      favActivityRaw: fav,
      preferredCategories,
      preferredSubcategories,
      availableTimes,
    };
  });

  return {
    id: String(meeting.id),
    title: meeting.name,
    dday,
    schedule: scheduleISO ? { dateISO: scheduleISO } : undefined,
    participants,
    place: primaryPlace,
    course,
    plan: meeting.plan as any,
    mustVisitPlaces,
    meetingProfile,
  } as PromiseDetail;
}

/**
 * 🔹 약속 상세 조회
 * - FastAPI: GET /meetings/{meeting_id}
 * - 실제 이동시간 계산 포함
 */
export async function getPromiseDetail(
  promiseId: string
): Promise<PromiseDetail> {
  const meetingId = Number(promiseId);
  if (Number.isNaN(meetingId)) {
    throw new Error(`잘못된 meeting id: ${promiseId}`);
  }

  const meeting = await http.request<MeetingResponse>(`/meetings/${meetingId}`);
  return mapMeetingToPromiseDetailAsync(meeting);
}

/**
 * 🔹 약속 리스트 조회
 * - FastAPI: GET /meetings/
 * - 리스트는 빠른 표시를 위해 이동시간 계산 없이 반환
 */
export async function getPromiseList(): Promise<PromiseDetail[]> {
  const meetings = await http.request<MeetingResponse[]>("/meetings/");
  return Promise.all(meetings.map(mapMeetingToPromiseDetailAsync));
}

/**
 * 🔹 약속 저장 (HTTP 버전)
 *   - MeetingProfile 포함해서 PATCH
 */
export async function savePromiseDetail(
  detail: PromiseDetail
): Promise<PromiseDetail> {
  const meetingId = Number(detail.id);
  if (Number.isNaN(meetingId)) {
    throw new Error(`잘못된 meeting id: ${detail.id}`);
  }

  const profile: any = detail.meetingProfile ?? {};

  const withWhom =
    typeof profile.withWhom === "string" && profile.withWhom.trim()
      ? profile.withWhom.trim()
      : null;

  const purpose = serializeMultiField(profile.purpose);
  const vibe = serializeMultiField(profile.vibe);
  const budget = serializeMultiField(profile.budget);

  await http.request(`/meetings/${meetingId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: detail.title ?? "",
      with_whom: withWhom,
      purpose,
      vibe,
      budget,
    }),
  });

  // 서버 상태가 변경됐다고 가정하고 다시 한 번 상세 조회
  const meeting = await http.request<MeetingResponse>(`/meetings/${meetingId}`);
  return mapMeetingToPromiseDetailAsync(meeting);
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

  return mapMeetingToPromiseDetailAsync(meeting);
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

/**
 * 🔹 참여자 삭제 (HTTP 버전)
 */
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

/**
 * 🔹 자동 일정/장소/코스 계산 (HTTP 버전)
 */
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
  return mapMeetingToPromiseDetailAsync(meeting);
}

/**
 * 🔹 코스 자동 계산
 *   - POST /meetings/{id}/courses/auto
 *   - 그 후 최신 Meeting 데이터를 다시 불러와서 PromiseDetail로 변환
 */
export async function calculateAutoCourse(
  promiseId: string
): Promise<PromiseDetail> {
  const meetingId = Number(promiseId);
  if (Number.isNaN(meetingId)) {
    throw new Error(`잘못된 meeting id: ${promiseId}`);
  }

  await http.request(`/meetings/${meetingId}/courses/auto`, {
    method: "POST",
  });

  const meeting = await http.request<MeetingResponse>(`/meetings/${meetingId}`);
  return mapMeetingToPromiseDetailAsync(meeting);
}

/**
 * 🔹 약속 이름만 수정 (HTTP 버전)
 */
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

/**
 * 🔹 약속 전체 초기화
 */
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

  // 4) 약속 이름/프로필 비우기
  await http.request(`/meetings/${meetingId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "",
      with_whom: null,
      purpose: null,
      vibe: null,
      budget: null,
      profile_memo: null,
    }),
  });

  const meeting = await http.request<MeetingResponse>(`/meetings/${meetingId}`);
  return mapMeetingToPromiseDetailAsync(meeting);
}

/**
 * 🔹 반드시 가고 싶은 장소 추가 (좌표도 같이 보낼 수 있음)
 */
export async function addMustVisitPlace(
  promiseId: string | number,
  payload: {
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }
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
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
    }),
  });
}

/**
 * 🔹 반드시 가고 싶은 장소 삭제
 */
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

/**
 * 🔹 약속에 연결된 장소(코스 장소) 목록 조회
 */
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

/**
 * 🔹 선택한 장소를 MeetingPlan의 확정 장소로 반영
 */
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
    }),
  });
}
