import { http } from "@/lib/http";
import type { PromiseDetail } from "@/types/promise";

export async function getPromiseDetail(
  promiseId: string
): Promise<PromiseDetail> {
  // 백엔드 응답 스키마와 프론트 도메인 타입이 다르면 여기서 매핑해 일원화
  return http.request<PromiseDetail>(`/promises/${promiseId}/detail`);
}
