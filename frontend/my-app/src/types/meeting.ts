// src/types/meeting.ts
export type Meeting = {
  id: number | string;
  name: string;
  participants: any[];
};

// 백엔드 Meeting 응답 형태 (Swagger 기준)
export type MeetingResponse = {
  id: number;
  name: string;
  participants: Array<{
    id: number;
    name: string;
    // 백엔드에 프로필 이미지 필드가 있으면 여기에 추가
    avatar_url?: string | null;
  }>;
  // 🔹 plan, places 추가
  plan?: {
    id: number;
    meeting_id: number;
    meeting_time: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    total_time: number;
    available_dates: any[];
  };
  places?: Array<{
    id: number;
    meeting_id: number;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    category: string;
    duration: number;
  }>;
};
