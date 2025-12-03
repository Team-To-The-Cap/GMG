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
  // 백엔드에 프로필 이미지 필드가 있으면 여기에 추가
  avatar_url?: string | null;

  // 아래는 ParticipantResponse에 맞게 필요한 경우 확장 가능
  start_address?: string | null;
  transportation?: string | null;
  fav_activity?: string | null;
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
