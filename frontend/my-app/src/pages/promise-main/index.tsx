// src/pages/promise-main/index.ts
import { useState, useCallback } from "react";
import {
  savePromiseDetail,
  deleteParticipant,
  calculateAutoPlan,
  updateMeetingName,
  resetPromiseOnServer,
} from "@/services/promise/promise.service";
import type { PromiseDetail } from "@/types/promise";

export type PromiseMainHandlers = {
  onChangeTitle: (value: string) => Promise<void>;
  onRemoveParticipant: (id: string) => Promise<void>;
  onCalculatePlan: () => Promise<void>;
  onCalculateCourse: () => Promise<void>;
  onSave: () => Promise<void>;
  onReset: () => Promise<void>;
};

export type PromiseMainController = {
  data?: PromiseDetail;
  setData: React.Dispatch<React.SetStateAction<PromiseDetail | undefined>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error?: string;
  setError: React.Dispatch<React.SetStateAction<string | undefined>>;
  saving: boolean;
  calculatingPlan: boolean;
  calculatingCourse: boolean;
} & PromiseMainHandlers;

type UsePromiseMainControllerArgs = {
  promiseId?: string;
  data?: PromiseDetail;
  setData: React.Dispatch<React.SetStateAction<PromiseDetail | undefined>>;
};

export function usePromiseMainController({
  promiseId,
  data,
  setData,
}: UsePromiseMainControllerArgs): PromiseMainController {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calculatingPlan, setCalculatingPlan] = useState(false);
  const [calculatingCourse, setCalculatingCourse] = useState(false);
  const [error, setError] = useState<string>();

  // ✅ 기본: 약속 이름 변경 (서버 PATCH + 실패 시 재조회)
  const onChangeTitle = useCallback(
    async (value: string) => {
      if (!promiseId) return;
      const trimmed = value.trim();

      // UI 먼저 업데이트
      setData((prev) => (prev ? { ...prev, title: trimmed } : prev));

      try {
        await updateMeetingName(promiseId, trimmed);
      } catch (e: any) {
        console.error(e);
        alert(e?.message ?? "약속 이름 저장 중 오류가 발생했습니다.");
        // 실패 시에는 호출하는 쪽에서 재조회 로직을 추가적으로 붙일 수 있음
      }
    },
    [promiseId, setData]
  );

  // ✅ 기본: 참여자 삭제 (낙관적 업데이트 + 서버 연동)
  const onRemoveParticipant = useCallback(
    async (id: string) => {
      if (!promiseId) return;

      // UI 먼저 제거
      setData((prev) => {
        if (!prev) return prev;
        const next = (prev.participants ?? []).filter((p) => p.id !== id);
        return { ...prev, participants: next };
      });

      try {
        await deleteParticipant(promiseId, id);
      } catch (e: any) {
        console.error(e);
        alert(e?.message ?? "참여자 삭제 중 오류가 발생했습니다.");
        // 필요하면 호출하는 쪽에서 재조회 추가 가능
      }
    },
    [promiseId, setData]
  );

  // ✅ 기본: 일정/장소/코스 자동 계산
  const onCalculatePlan = useCallback(async () => {
    if (!promiseId) return;
    try {
      setCalculatingPlan(true);
      const updated = await calculateAutoPlan(promiseId);
      setData(updated);
      alert("일정/장소가 계산되었습니다!");
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "계산 중 오류가 발생했습니다.");
    } finally {
      setCalculatingPlan(false);
    }
  }, [promiseId, setData]);

  // ✅ 기본: 코스 계산 (현재는 TODO)
  const onCalculateCourse = useCallback(async () => {
    try {
      setCalculatingCourse(true);
      alert("코스 계산 기능은 아직 준비 중입니다.");
    } catch (e: any) {
      console.error(e);
    } finally {
      setCalculatingCourse(false);
    }
  }, []);

  // ✅ 기본: 저장
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
  }, [data, setData]);

  // ✅ 기본: 서버까지 전체 초기화
  const onReset = useCallback(async () => {
    if (!data) return;

    const ok = window.confirm(
      "정말 이 약속의 모든 데이터를 초기화하시겠습니까?\n\n" +
        "약속 이름, 참석자, 일정, 장소, 코스 정보가 모두 삭제되고 서버에 저장됩니다."
    );
    if (!ok) return;

    try {
      setSaving(true);
      setLoading(true);

      const cleared = await resetPromiseOnServer(data);
      setData(cleared);

      alert("약속 내용이 모두 초기화되었습니다.");
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "초기화 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
      setLoading(false);
    }
  }, [data, setData]);

  return {
    data,
    setData,
    loading,
    setLoading,
    error,
    setError,
    saving,
    calculatingPlan,
    calculatingCourse,
    onChangeTitle,
    onRemoveParticipant,
    onCalculatePlan,
    onCalculateCourse,
    onSave,
    onReset,
  };
}
