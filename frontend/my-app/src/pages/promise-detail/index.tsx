// src/pages/promise-detail/index.tsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import PromiseMainView from "@/pages/promise-main/index.view";
import { getPromiseDetail } from "@/services/promise/promise.service";
import type { PromiseDetail } from "@/types/promise";
import { DEFAULT_PROMISE_ID } from "@/config/runtime";
import { usePromiseMainController } from "@/pages/promise-main/index";

export default function PromiseDetailPage() {
  const { promiseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const navState = location.state as {
    finalDate?: string;
    finalDateDisplay?: string;
  } | null;

  const [data, setData] = useState<PromiseDetail>();

  // 🔹 공통 컨트롤러 사용
  const {
    loading,
    setLoading,
    error,
    setError,
    saving,
    calculatingPlan,
    calculatingCourse,
    onChangeTitle: baseOnChangeTitle,
    onRemoveParticipant,
    onCalculatePlan,
    onCalculateCourse,
    onSave,
    onReset,
  } = usePromiseMainController({ promiseId, data, setData });

  // 🔹 로딩 로직 (detail 전용: finalDate 패치)
  useEffect(() => {
    if (!promiseId) {
      navigate(`/details/${DEFAULT_PROMISE_ID}`, { replace: true });
      return;
    }

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(undefined);

        const res = await getPromiseDetail(promiseId);

        const finalDate = navState?.finalDate;
        let patched: PromiseDetail = res;

        if (finalDate) {
          patched = {
            ...res,
            schedule: {
              ...res.schedule,
              dateISO: finalDate,
            },
          };
        }

        if (alive) setData(patched);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "알 수 없는 오류");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [promiseId, navigate, navState?.finalDate, setLoading, setError]);

  // 🔹 필요하면 base 핸들러를 살짝 래핑해서 override 가능
  const onChangeTitle = useCallback(
    async (value: string) => {
      // detail 페이지에서만 별도 로깅/추가 행동 넣고 싶으면 여기
      await baseOnChangeTitle(value);
      // 예: 실패 시 재조회 등의 추가 처리도 가능
    },
    [baseOnChangeTitle]
  );

  const onEditSchedule = useCallback(() => {
    if (!promiseId) return;
    navigate(`/time/timeresult/${promiseId}`);
  }, [promiseId, navigate]);

  const onEditPlace = useCallback(() => {
    if (!promiseId) return;
    navigate(`/details/${promiseId}/place-calculation`);
  }, [promiseId, navigate]);

  const onEditCourse = useCallback(() => {
    alert("코스 수정 기능 준비 중!");
  }, []);

  const onAddParticipant = useCallback(() => {
    if (!promiseId) return;

    navigate(`/details/${promiseId}/participants/new`, {
      state: { from: "details" },
    });
  }, [promiseId, navigate]);

  const onEditTitle = useCallback(() => {
    alert("약속 이름 수정 기능 준비 중!");
  }, []);

  return (
    <PromiseMainView
      loading={loading}
      error={error}
      data={data}
      onEditSchedule={onEditSchedule}
      onEditPlace={onEditPlace}
      onEditCourse={onEditCourse}
      onAddParticipant={onAddParticipant}
      onEditTitle={onEditTitle}
      onChangeTitle={onChangeTitle} // ✅ 기본 핸들러 래핑 버전
      onRemoveParticipant={onRemoveParticipant}
      onCalculatePlan={onCalculatePlan}
      onCalculateCourse={onCalculateCourse}
      onSave={onSave}
      saving={saving}
      calculatingPlan={calculatingPlan}
      calculatingCourse={calculatingCourse}
      onReset={onReset} // ✅ 기본 서버 초기화 사용
    />
  );
}
