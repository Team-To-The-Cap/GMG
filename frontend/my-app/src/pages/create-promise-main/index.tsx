// src/pages/create-promise-main/index.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import CreatePromiseMainView from "./index.view";
import {
  getPromiseDetail,
  savePromiseDetail,
  deleteParticipant,
  calculateAutoPlan,
} from "@/services/promise/promise.service";
import type { PromiseDetail } from "@/types/promise";
import { DEFAULT_PROMISE_ID } from "@/config/runtime";

const DRAFT_PROMISE_ID_KEY = "GMG_LAST_DRAFT_PROMISE_ID";

export default function CreatePromiseMain() {
  const { promiseId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<PromiseDetail>();

  // 🔹 현재 열려 있는 약속이 "작성 중 초안"인지 판별
  const isDraft = useMemo(() => {
    if (!promiseId) return false;
    const draftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);
    return draftId === promiseId;
  }, [promiseId]);

  useEffect(() => {
    if (!promiseId) {
      navigate(`/create/${DEFAULT_PROMISE_ID}`, { replace: true });
      return;
    }

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(undefined);

        // ✅ 이제 여기서 promiseId === "new" 분기 제거
        const res = await getPromiseDetail(promiseId);
        if (alive) setData(res);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "알 수 없는 오류");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [promiseId, navigate]);

  // 약속 이름 편집(낙관적 업데이트 + 초안이면 draft 저장)
  const onChangeTitle = useCallback(
    (value: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = { ...prev, title: value };
        if (isDraft) {
          localStorage.setItem(DRAFT_PROMISE_ID_KEY, next.id);
          // 필요하면 전체 draft 내용도 별도 key로 저장 가능
        }
        return next;
      });
    },
    [isDraft]
  );

  const onEditSchedule = useCallback(() => {
    navigate(`/time/timeresult/${promiseId}`);
  }, [promiseId, navigate]);

  const onEditPlace = useCallback(() => {
    navigate(`/create/${promiseId}/place-calculation`);
  }, [promiseId, navigate]);

  const onEditCourse = useCallback(() => {
    alert("코스 수정 기능 준비 중!");
  }, [promiseId]);

  // ✅ 새 인원 추가 버튼
  const onAddParticipant = useCallback(() => {
    if (!promiseId) return;
    navigate(`/create/${promiseId}/participants/new`);
  }, [promiseId, navigate]);

  const onEditTitle = useCallback(() => {
    alert("약속 이름 수정 기능 준비 중!");
  }, [promiseId, navigate]);

  // 참여자 삭제(낙관적 업데이트 + 초안이면 draft 저장 + 서버 연동)
  const onRemoveParticipant = useCallback(
    async (id: string) => {
      // 1) 먼저 화면에서 제거 (낙관적 업데이트)
      setData((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          participants: (prev.participants ?? []).filter((p) => p.id !== id),
        };

        if (isDraft) {
          // 초안인 경우, 마지막으로 작업하던 draft의 id만 계속 기억
          localStorage.setItem(DRAFT_PROMISE_ID_KEY, next.id);
        }

        return next;
      });

      // 2) promiseId 없으면 여기까지만 (이 경우는 거의 없겠지만 가드)
      if (!promiseId) return;

      try {
        // 3) 서버에 실제 삭제 요청
        await deleteParticipant(promiseId, id);
      } catch (e: any) {
        console.error(e);
        alert(e?.message ?? "참여자 삭제 중 오류가 발생했습니다.");

        // 4) 실패 시 서버 상태로 다시 맞추기 (재조회)
        try {
          const fresh = await getPromiseDetail(promiseId);
          setData(fresh);
        } catch (err) {
          console.error("삭제 실패 후 재조회도 실패:", err);
        }
      }
    },
    [isDraft, promiseId]
  );

  // 계산 버튼
  const onCalculate = useCallback(async () => {
    if (!promiseId) return;

    try {
      setSaving(true); // 별도 calculating 상태 만들기 귀찮으면 이거 재사용

      const updated = await calculateAutoPlan(promiseId);
      setData(updated);

      alert("일정/장소/코스가 계산되었습니다!");
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "계산 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }, [promiseId]);

  // ✅ 저장 버튼: 실제로 서버에 저장 + draft ID 정리
  const onSave = useCallback(async () => {
    if (!data) return;
    try {
      setSaving(true);
      const saved = await savePromiseDetail(data);
      setData(saved);

      // 작성 중 초안이던 경우, 이제는 "저장 완료" 상태이므로 draft ID 삭제
      const draftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);
      if (draftId && draftId === saved.id) {
        localStorage.removeItem(DRAFT_PROMISE_ID_KEY);
      }

      alert("저장되었습니다!");

      // 원하면 저장 후 상세 화면으로 이동
      // navigate(`/details/${saved.id}`);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }, [data]);

  // ✅ 초기화 버튼: ID는 유지, 내용만 비우기
  const onReset = useCallback(() => {
    if (!data) return;
    const cleared: PromiseDetail = {
      ...data,
      title: "",
      participants: [],
      place: undefined,
      // 코스/스케줄은 정책에 맞게 조정 가능
      // schedule: { dateISO: new Date().toISOString() },
      // course: { ...data.course, items: [], summary: { totalMinutes: 0, ... } }
    };
    setData(cleared);

    // 초안이면 draft 저장 내용도 업데이트 (여기서는 ID만 관리라면 noop)
    if (isDraft) {
      localStorage.setItem(DRAFT_PROMISE_ID_KEY, cleared.id);
    }
  }, [data, isDraft]);

  return (
    <CreatePromiseMainView
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
      onCalculate={onCalculate}
      onSave={onSave}
      saving={saving}
      isDraft={isDraft}
      onReset={onReset}
    />
  );
}
