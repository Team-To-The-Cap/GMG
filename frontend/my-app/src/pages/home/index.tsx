// src/pages/home/index.tsx
import { useEffect, useState, useCallback, useMemo } from "react";
import HomeView from "./index.view";
import {
  getPromiseList,
  deletePromise,
} from "@/services/promise/promise.service";
import type { PromiseDetail } from "@/types/promise";
import { sortPromisesByDday } from "@/utils/sortPromisesByDday";
import { DRAFT_PROMISE_ID_KEY } from "@/assets/constants/storage";

// 홈에서 사용할 아이템 = 상세 그대로
export type HomeItem = PromiseDetail;

// dday가 없을 때만 meeting date로 보정 계산
function calcDdayFromISO(isoDate?: string): number {
  if (!isoDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(isoDate);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** 참가자 응답률 계산용 타입 (available_times 가 있을 수도, 없을 수도 있으므로 느슨하게 잡음) */
type ParticipantWithTimes = {
  available_times?: { start_time: string; end_time: string }[];
};

/** 홈 요약 위젯 데이터 */
export type HomeSummary = {
  todoScheduleCount: number; // 일정/장소 미정 약속 수
  upcomingThisWeekCount: number; // 이번 주(7일 내) 약속 수
  thisMonthCount: number; // 이번 달 약속 수
  avgResponseRate: number | null; // 참가자 응답률 (0~100) 없으면 null
};

/** 홈에서 쓸 약속 그룹 */
export type GroupedMeetings = {
  unscheduled: HomeItem[];
  upcoming: HomeItem[];
  past: HomeItem[];
};

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [items, setItems] = useState<HomeItem[]>([]);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);
      const res = await getPromiseList(); // PromiseDetail[]

      const draftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);

      const normalized = res.map((x) => ({
        ...x,
        dday:
          typeof x.dday === "number"
            ? x.dday
            : calcDdayFromISO(x.schedule?.dateISO),
      }));

      const sorted = sortPromisesByDday(normalized);

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
      await deletePromise(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "삭제 중 오류가 발생했습니다.");
    }
  }, []);

  // ───────────────── 약속 그룹 나누기 ─────────────────
  const grouped: GroupedMeetings = useMemo(() => {
    const unscheduled: HomeItem[] = [];
    const upcoming: HomeItem[] = [];
    const past: HomeItem[] = [];

    items.forEach((item) => {
      const hasSchedule = !!item.schedule?.dateISO;
      const d = typeof item.dday === "number" ? item.dday : 0;

      if (!hasSchedule) {
        unscheduled.push(item);
      } else if (d < 0) {
        past.push(item);
      } else {
        upcoming.push(item);
      }
    });

    return { unscheduled, upcoming, past };
  }, [items]);

  // ───────────────── 위젯용 요약 데이터 계산 ─────────────────
  const summary: HomeSummary = useMemo(() => {
    if (!items.length) {
      return {
        todoScheduleCount: 0,
        upcomingThisWeekCount: 0,
        thisMonthCount: 0,
        avgResponseRate: null,
      };
    }

    const today = new Date();
    const thisYear = today.getFullYear();
    const thisMonth = today.getMonth(); // 0~11

    let todoScheduleCount = 0;
    let upcomingThisWeekCount = 0;
    let thisMonthCount = 0;

    let responseRateSum = 0;
    let responseRateCnt = 0;

    items.forEach((item) => {
      const hasSchedule = !!item.schedule?.dateISO;
      const d = typeof item.dday === "number" ? item.dday : 0;

      if (!hasSchedule) {
        todoScheduleCount += 1;
      }

      if (hasSchedule && d >= 0 && d <= 7) {
        upcomingThisWeekCount += 1;
      }

      if (hasSchedule && item.schedule?.dateISO) {
        const dt = new Date(item.schedule.dateISO);
        if (dt.getFullYear() === thisYear && dt.getMonth() === thisMonth) {
          thisMonthCount += 1;
        }
      }

      // 참가자 응답률 (available_times 를 1개라도 넣은 참가자 / 전체 참가자)
      const participants = item.participants as ParticipantWithTimes[];
      if (participants && participants.length > 0) {
        const answered = participants.filter(
          (p) => p.available_times && p.available_times.length > 0
        ).length;
        const rate = (answered / participants.length) * 100;
        responseRateSum += rate;
        responseRateCnt += 1;
      }
    });

    const avgResponseRate =
      responseRateCnt > 0
        ? Math.round(responseRateSum / responseRateCnt)
        : null;

    return {
      todoScheduleCount,
      upcomingThisWeekCount,
      thisMonthCount,
      avgResponseRate,
    };
  }, [items]);

  return (
    <HomeView
      loading={loading}
      error={error}
      items={items}
      grouped={grouped}
      summary={summary}
      onRetry={fetchList}
      onDelete={handleDelete}
    />
  );
}
