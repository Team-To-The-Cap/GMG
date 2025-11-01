export type Participant = { id: string; name: string; avatarUrl: string };
export type Schedule = { dateISO: string }; // "2025-10-27T00:00:00+09:00" 등
export type CourseSummary = { text: string };

export type PromiseDetail = {
  id: string;
  title: string;
  ddayLabel: string; // e.g. "D-1"
  participants: Participant[];
  schedule: Schedule;
  course: CourseSummary;
};
