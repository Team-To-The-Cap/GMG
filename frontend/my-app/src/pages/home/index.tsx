// src/pages/home/index.tsx
import { useEffect, useState, useCallback } from "react";
import HomeView from "./index.view";
import { getPromiseList } from "@/services/promise/promise.service";
import type { PromiseDetail } from "@/types/promise";
import { sortPromisesByDday } from "@/utils/sortPromisesByDday"; // ✅ 추가

// 홈에서 사용할 아이템 = 상세 그대로
export type HomeItem = PromiseDetail;

// dday가 없을 때만 meeting date로 보정 계산 (안 쓰면 제거해도 됨)
function calcDdayFromISO(isoDate?: string): number {
  if (!isoDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(isoDate);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [items, setItems] = useState<HomeItem[]>([]);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);
      const res = await getPromiseList(); // PromiseDetail[]

      // dday가 누락된 경우만 보정
      const normalized = res.map((x) => ({
        ...x,
        dday:
          typeof x.dday === "number"
            ? x.dday
            : calcDdayFromISO(x.schedule?.dateISO),
      }));

      // ✅ dday 기준 정렬 (D+2, D-Day, D-1, D-7 …)
      const sorted = sortPromisesByDday(normalized);

      setItems(sorted);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // ✅ 약속 삭제 핸들러
  const handleDelete = useCallback(
    async (id: string) => {
      const ok = window.confirm("삭제하실까요?");
      if (!ok) return;

      // TODO: 여기서 서버 삭제 API 호출하면 됨.
      // 예: await deletePromise(id);

      // 일단 UI 상에서만 제거
      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    [setItems]
  );

  return (
    <HomeView
      loading={loading}
      error={error}
      items={items}
      onRetry={fetchList}
      onDelete={handleDelete}
    />
  );
}
