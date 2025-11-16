// src/services/meeting.service.ts
import type { Meeting } from "@/types/meeting";
import * as httpImpl from "./meeting.service.http";
import * as mockImpl from "./meeting.service.mock";

const useMock = import.meta.env.VITE_TEST_MODE === "true";

export async function createMeeting(name: string): Promise<Meeting> {
  return useMock ? mockImpl.createMeeting(name) : httpImpl.createMeeting(name);
}

export async function getMeetingDetail(id: string | number): Promise<Meeting> {
  return useMock
    ? mockImpl.getMeetingDetail(id)
    : httpImpl.getMeetingDetail(id);
}
