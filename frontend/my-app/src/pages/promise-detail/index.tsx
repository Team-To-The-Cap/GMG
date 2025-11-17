// src/pages/promise-detail/index.tsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import CreatePromiseMainView from "./index.view";
import {
  getPromiseDetail,
  savePromiseDetail,
  deleteParticipant,
  calculateAutoPlan,
} from "@/services/promise/promise.service";
import type { PromiseDetail } from "@/types/promise";
import { DEFAULT_PROMISE_ID } from "@/config/runtime";

export default function PromiseDetailPage() {
  const { promiseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const navState = location.state as
    | {
        finalDate?: string; // "2025-11-14"
        finalDateDisplay?: string;
      }
    | null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<PromiseDetail>();

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

        // 시간 조율 화면에서 선택한 날짜
        const finalDate = navState?.finalDate;

        let patched: PromiseDetail = res;

        if (finalDate) {
          // res.schedule이 항상 있다는 전제 하에
          patched = {
            ...res,
            schedule: {
              ...res.schedule,
              // 🚩 여기만 바꿔주면 index.view가 알아서 새 날짜로 그림
              dateISO: finalDate, // e.g. "2025-11-14"
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
  }, [promiseId, navigate, navState?.finalDate]);

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

  const onChangeTitle = useCallback((value: string) => {
    setData((prev) => (prev ? { ...prev, title: value } : prev));
  }, []);

  const onRemoveParticipant = useCallback(
    async (id: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = (prev.participants ?? []).filter((p) => p.id !== id);
        return { ...prev, participants: next };
      });

      if (!promiseId) return;

      try {
        await deleteParticipant(promiseId, id);
      } catch (e: any) {
        console.error(e);
        alert(e?.message ?? "참여자 삭제 중 오류가 발생했습니다.");

        try {
          const fresh = await getPromiseDetail(promiseId);
          setData(fresh);
        } catch (err) {
          console.error("삭제 실패 후 재조회도 실패:", err);
        }
      }
    },
    [promiseId],
  );

  const onCalculate = useCallback(async () => {
    if (!promiseId) return;

    try {
      setSaving(true);
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

  const onSave = useCallback(async () => {
    if (!data) return;
    try {
      setSaving(true);
      const saved = await savePromiseDetail(data);
      setData(saved);
      alert("저장되었습니다!");
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }, [data]);

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
    />
  );
}
