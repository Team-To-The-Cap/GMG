// src/services/meeting/meeting.service.mock.ts
import type { Meeting } from "@/types/meeting";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const MOCK_MEETING_DB: Record<string | number, Meeting> = {};

export async function createMeeting(name: string): Promise<Meeting> {
  await delay(200);

  const id = `mock-meeting-${Date.now()}`;

  const meeting: Meeting = {
    id,
    name,
    participants: [],
  };

  MOCK_MEETING_DB[id] = meeting;
  return meeting;
}

export async function getMeetingDetail(id: string | number): Promise<Meeting> {
  await delay(200);

  const item = MOCK_MEETING_DB[id];
  if (!item) {
    throw new Error("Mock Meeting 데이터에 해당 약속이 없습니다.");
  }
  return item;
}
