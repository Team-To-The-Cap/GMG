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
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  duration: number;
};

/** 백엔드 Meeting 응답 전체 */
export type MeetingResponse = {
  id: number;
  name: string;
  participants: MeetingParticipant[];

  // 🔹 자동 계산 결과 등
  plan?: MeetingPlan;

  // 🔹 추천 장소들
  places?: MeetingPlace[];
};
