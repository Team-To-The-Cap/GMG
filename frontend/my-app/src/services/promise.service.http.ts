import type { PromiseDetail } from "@/types/promise";
import { RUNTIME } from "@/config/runtime";

export async function getPromiseDetail(
  promiseId: string
): Promise<PromiseDetail> {
  const res = await fetch(
    `${RUNTIME.API_BASE_URL}/promises/${promiseId}/detail`,
    {
      headers: { "Content-Type": "application/json" },
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<PromiseDetail>;
}
