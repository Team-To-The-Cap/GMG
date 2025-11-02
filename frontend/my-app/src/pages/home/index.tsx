// src/pages/home/index.tsx
import { useEffect, useState, useCallback } from "react";
import HomeView from "./index.view";
import { getPromiseList } from "@/services/promise.service";
import type { PromiseDetail } from "@/types/promise";

// 홈에서 사용할 아이템 = 상세 그대로
export type HomeItem = PromiseDetail;

// dday가 없을 때만 meeting date로 보정 계산 (안 쓰면 제거해도 됨)
function calcDdayFromISO(isoDate?: string): number {
  if (!isoDate) return 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(isoDate); target.setHours(0, 0, 0, 0);
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
        dday: typeof x.dday === "number" ? x.dday : calcDdayFromISO(x.schedule?.dateISO),
      }));
      setItems(normalized);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  return (
    <HomeView
      loading={loading}
      error={error}
      items={items}
      onRetry={fetchList}
    />
  );
} 
