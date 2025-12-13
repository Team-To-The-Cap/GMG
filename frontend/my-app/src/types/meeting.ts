// src/types/meeting.ts

/** 프론트에서 대충 쓰는 Meeting 요약 타입 (기존 코드 유지용) */
export type Meeting = {
  id: number | string;
  name: string;
  participants: any[];
};

/** 서버에서 내려오는 Participant 타입 */
export type MeetingParticipant = {
  id: number;
  name: string;
  avatar_url?: string | null;

  start_address?: string | null;
  start_latitude?: number | null;
  start_longitude?: number | null;

  transportation?: string | null;
  fav_activity?: string | null;
  fav_subcategories?: string | null;  // JSON 문자열로 서브 카테고리 저장
  available_times?: {
    id: number;
    start_time: string;
    end_time: string;
  }[];
};

/** 서버 MeetingPlan 타입 (Swagger 기준) */
export type MeetingPlan = {
  id: number;
  meeting_id: number;
  meeting_time: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  total_time: number;
  available_dates: any[];
};

/** 서버 Place 타입 */
export type MeetingPlace = {
  id: number;
  meeting_id: number;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  category?: string | null;
  duration?: number | null;
};

/** 서버 Must-Visit Place 타입 */
export type MeetingMustVisitPlace = {
  id: number;
  meeting_id: number;
  name: string;
  address: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

/** 백엔드 Meeting 응답 전체 */
export type MeetingResponse = {
  id: number;
  name: string;

  // ✨ 백엔드 MeetingBase 확장 필드들
  with_whom?: string | null;
  purpose?: string | null;
  vibe?: string | null;
  budget?: string | null;
  profile_memo?: string | null;

  participants: MeetingParticipant[];

  plan?: MeetingPlan;
  places?: MeetingPlace[];

  must_visit_places?: MeetingMustVisitPlace[];
};
