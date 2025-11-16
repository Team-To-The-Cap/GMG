// src/services/meeting.service.ts

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://223.130.152.114:8001";

export type MeetingResponse = {
  id: number;
  name: string;
  participants: any[];
};

export async function createMeeting(name: string): Promise<MeetingResponse> {
  const url = `${API_BASE_URL}/meetings/`;
  console.log("createMeeting →", url);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create meeting: ${res.status} ${text}`);
  }

  return res.json();
}
