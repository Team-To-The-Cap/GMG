// src/services/meeting/meeting.service.http.ts
import type { Meeting } from "@/types/meeting";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://211.188.55.98:8001";

/** FastAPI: POST /meetings */
export async function createMeeting(name: string): Promise<Meeting> {
  const url = `${API_BASE_URL}/meetings/`;
  console.log("[HTTP] createMeeting →", url);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    throw new Error(
      `HTTP createMeeting failed: ${res.status} ${await res.text()}`
    );
  }

  return res.json();
}

/** FastAPI: GET /meetings/{id} */
export async function getMeetingDetail(id: string | number): Promise<Meeting> {
  const url = `${API_BASE_URL}/meetings/${id}`;
  console.log("[HTTP] getMeetingDetail →", url);

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(
      `HTTP getMeetingDetail failed: ${res.status} ${await res.text()}`
    );
  }

  return res.json();
}
