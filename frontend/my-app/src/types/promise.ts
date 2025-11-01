export type Participant = {
  id: string;
  name: string;
  avatarUrl: string;
};

export type Schedule = {
  dateISO: string; // "2025-10-27T00:00:00+09:00"
};

export type CourseSummary = {
  text: string;
};

export type Place = {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
};

/** 약속 상세 정보 */
export type PromiseDetail = {
  id: string;
  title: string;
  dday: number;
  participants: Participant[];
  schedule: Schedule;
  place?: Place; // ✅ optional 처리
  course: CourseSummary;
};
