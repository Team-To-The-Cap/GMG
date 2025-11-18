// src/pages/home/index.tsx
import { useEffect, useState, useCallback } from "react";
import HomeView from "./index.view";
import {
  getPromiseList,
  deletePromise,
} from "@/services/promise/promise.service";
import type { PromiseDetail } from "@/types/promise";
import { sortPromisesByDday } from "@/utils/sortPromisesByDday"; // ✅ 추가
import { DRAFT_PROMISE_ID_KEY } from "@/assets/constants/storage";

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

      // ✅ 초안 약속 ID 가져오기
      const draftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);

      // dday가 누락된 경우만 보정
      const normalized = res.map((x) => ({
        ...x,
        dday:
          typeof x.dday === "number"
            ? x.dday
            : calcDdayFromISO(x.schedule?.dateISO),
      }));

      // ✅ dday 기준 정렬
      const sorted = sortPromisesByDday(normalized);

      // ✅ localStorage에 저장된 draft 약속은 리스트에서 제거
      const filtered =
        draftId != null ? sorted.filter((item) => item.id !== draftId) : sorted;

      setItems(filtered);
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

  const handleDelete = useCallback(async (id: string) => {
    const ok = window.confirm("삭제하실까요?");
    if (!ok) return;

    try {
      // 1) 서버에서 삭제
      await deletePromise(id);

      // 2) UI에서 목록 업데이트
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "삭제 중 오류가 발생했습니다.");
    }
  }, []);

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
