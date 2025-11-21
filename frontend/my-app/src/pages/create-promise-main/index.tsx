// src/pages/create-promise-main/index.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import PromiseMainView from "@/pages/promise-main/index.view";
import {
  getPromiseDetail,
  calculateAutoPlan,
  resetPromiseOnServer,
} from "@/services/promise/promise.service";
import type { PromiseDetail } from "@/types/promise";
import { DEFAULT_PROMISE_ID } from "@/config/runtime";
import {
  DRAFT_PROMISE_DATA_PREFIX,
  DRAFT_PROMISE_ID_KEY,
} from "@/assets/constants/storage";
import { usePromiseMainController } from "@/pages/promise-main/index";

export default function CreatePromiseMain() {
  const { promiseId } = useParams();
  const navigate = useNavigate();

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
    onRemoveParticipant: baseOnRemoveParticipant,
    onCalculatePlan: baseOnCalculatePlan,
    onCalculateCourse,
    onSave: baseOnSave,
    onReset: baseOnReset, // 기본 서버 초기화
  } = usePromiseMainController({ promiseId, data, setData });

  // 🔹 draft 헬퍼
  const persistDraft = useCallback((detail: PromiseDetail) => {
    localStorage.setItem(DRAFT_PROMISE_ID_KEY, detail.id);
    localStorage.setItem(
      DRAFT_PROMISE_DATA_PREFIX + detail.id,
      JSON.stringify(detail)
    );
  }, []);

  const isDraft = useMemo(() => {
    if (!promiseId) return false;
    const draftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);
    return draftId === promiseId;
  }, [promiseId]);

  // 🔹 로딩 로직 (create 전용: draft 우선)
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

        const draftRaw = localStorage.getItem(
          DRAFT_PROMISE_DATA_PREFIX + promiseId
        );
        if (draftRaw) {
          try {
            const draft = JSON.parse(draftRaw) as PromiseDetail;
            if (alive) {
              setData(draft);
              setLoading(false);
            }
            return;
          } catch (parseErr) {
            console.error("draft JSON parse error:", parseErr);
          }
        }

        const res = await getPromiseDetail(promiseId);
        if (alive) setData(res);
      } catch (e: any) {
        const draftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);
        if (draftId && draftId === promiseId) {
          localStorage.removeItem(DRAFT_PROMISE_ID_KEY);
          localStorage.removeItem(DRAFT_PROMISE_DATA_PREFIX + draftId);
          window.location.reload();
          return;
        }

        if (alive) setError(e?.message ?? "알 수 없는 오류");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [promiseId, navigate, setLoading, setError]);

  // ✅ create 전용: 제목 변경 시 draft도 반영하고 싶으면 이렇게 override
  const onChangeTitle = useCallback(
    async (value: string) => {
      await baseOnChangeTitle(value);
      setData((prev) => {
        if (!prev) return prev;
        const next = { ...prev, title: value.trim() };
        persistDraft(next);
        return next;
      });
    },
    [baseOnChangeTitle, persistDraft]
  );

  // ✅ create 전용: 참여자 삭제 시 draft까지 저장
  const onRemoveParticipant = useCallback(
    async (id: string) => {
      await baseOnRemoveParticipant(id);
      setData((prev) => {
        if (!prev) return prev;
        const next: PromiseDetail = {
          ...prev,
          participants: (prev.participants ?? []).filter((p) => p.id !== id),
        };
        persistDraft(next);
        return next;
      });
    },
    [baseOnRemoveParticipant, persistDraft]
  );

  // ✅ create 전용: 일정/장소 계산 후 draft 반영
  const onCalculatePlan = useCallback(async () => {
    if (!promiseId) return;

    try {
      // baseOnCalculatePlan을 써도 되지만, draft 저장이 필요하니까
      const updated = await calculateAutoPlan(promiseId);
      setData(updated);
      persistDraft(updated);
      alert("일정/장소가 계산되었습니다!");
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "계산 중 오류가 발생했습니다.");
    }
  }, [promiseId, persistDraft]);

  // ✅ create 전용: 저장 후 draft 정리
  const onSave = useCallback(async () => {
    if (!data) return;
    await baseOnSave(); // 서버에 저장
    const draftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);
    if (draftId && draftId === data.id) {
      localStorage.removeItem(DRAFT_PROMISE_ID_KEY);
      localStorage.removeItem(DRAFT_PROMISE_DATA_PREFIX + draftId);
    }
  }, [baseOnSave, data]);

  // ✅ create 전용: 서버 초기화 + draft까지 덮어쓰기
  const onReset = useCallback(async () => {
    if (!data) return;

    const ok = window.confirm(
      "정말 초기화하시겠습니까?\n입력하신 이름, 참가자, 일정, 장소 등이 모두 삭제됩니다."
    );
    if (!ok) return;

    try {
      const cleared = await resetPromiseOnServer(data);
      setData(cleared);
      persistDraft(cleared);
      alert("약속 내용이 모두 초기화되었습니다.");
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "초기화 중 오류가 발생했습니다.");
    }
  }, [data, persistDraft]);

  const onEditSchedule = useCallback(() => {
    navigate(`/time/timeresult/${promiseId}`);
  }, [promiseId, navigate]);

  const onEditPlace = useCallback(() => {
    navigate(`/create/${promiseId}/place-calculation`);
  }, [promiseId, navigate]);

  const onEditCourse = useCallback(() => {
    alert("코스 수정 기능 준비 중!");
  }, []);

  const onAddParticipant = useCallback(() => {
    if (!promiseId) return;
    navigate(`/create/${promiseId}/participants/new`, {
      state: { from: "create" },
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
      onChangeTitle={onChangeTitle}
      onRemoveParticipant={onRemoveParticipant}
      onCalculatePlan={onCalculatePlan}
      onCalculateCourse={onCalculateCourse} // 기본 핸들러 그대로 사용
      onSave={onSave}
      saving={saving}
      isDraft={isDraft}
      onReset={onReset}
      calculatingPlan={calculatingPlan}
      calculatingCourse={calculatingCourse}
    />
  );
}
