// src/utils/sortPromisesByDday.ts
import type { PromiseDetail } from "@/types/promise";

/**
 * dday 기준 정렬
 * - 숫자 오름차순 (과거 → 오늘 → 미래)
 *   예: D+2(-2), D-Day(0), D-1(1), D-7(7) ...
 * - 원본 배열은 수정하지 않고 새 배열을 반환
 */
export function sortPromisesByDday(list: PromiseDetail[]): PromiseDetail[] {
  return [...list].sort((a, b) => {
    const da = typeof a.dday === "number" ? a.dday : 0;
    const db = typeof b.dday === "number" ? b.dday : 0;
    return da - db; // 오름차순
  });
}
