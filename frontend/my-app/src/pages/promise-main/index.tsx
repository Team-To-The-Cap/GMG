// src/pages/promise-main/index.ts
import { useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  savePromiseDetail,
  deleteParticipant,
  calculateAutoPlan,
  updateMeetingName,
  resetPromiseOnServer,
  deleteMustVisitPlace,
} from "@/services/promise/promise.service";
import type { PromiseDetail } from "@/types/promise";

export type PromiseMainHandlers = {
  onChangeTitle: (value: string) => Promise<void>;
  onRemoveParticipant: (id: string) => Promise<void>;
  onCalculatePlan: () => Promise<void>;
  onCalculateCourse: () => Promise<void>;
  onSave: () => Promise<void>;
  onReset: () => Promise<void>;

  // ⬇️ 반드시 가고 싶은 장소 편집/관리 화면으로 이동
  onEditMustVisitPlaces: () => Promise<void>;
  onDeleteMustVisitPlace: (id: string) => Promise<void>;
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

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ 현재 경로를 보고 create / details 모드 판별
  const mode = useMemo<"create" | "details">(() => {
    const seg = location.pathname.split("/")[1]; // "", "create", "53", ...
    if (seg === "create") return "create";
    return "details";
  }, [location.pathname]);

  // ✅ 약속 이름 변경 (서버 PATCH + 실패 시 재조회)
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
      }
    },
    [promiseId, setData]
  );

  // ✅ 참여자 삭제 (낙관적 업데이트 + 서버 연동)
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
      }
    },
    [promiseId, setData]
  );

  // ✅ 일정/장소 자동 계산
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

  // ✅ 코스 계산 (현재는 TODO)
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

  // ✅ 저장
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

  // ✅ 전체 초기화
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

  // ✅ 반드시 가고 싶은 장소 관리 화면으로 이동
  const onEditMustVisitPlaces = useCallback(async () => {
    if (!promiseId) return;
    // 현재 페이지가 /create/:id 이면 /create/:id/must-visit/search
    // /details/:id 이면 /details/:id/must-visit/search
    navigate(`/${mode}/${promiseId}/must-visit/search`);
  }, [promiseId, mode, navigate]);

  // ✅ Must-Visit Place 삭제
  const onDeleteMustVisitPlace = useCallback(
    async (placeId: string) => {
      if (!promiseId) return;

      // 1) UI를 먼저 업데이트 (낙관적)
      setData((prev) => {
        if (!prev) return prev;
        const prevArr = (prev.mustVisitPlaces ?? []) as any[];
        const nextArr = prevArr.filter((p) => String(p.id) !== String(placeId));
        return {
          ...prev,
          mustVisitPlaces: nextArr,
        } as PromiseDetail;
      });

      // 2) 서버 삭제
      try {
        await deleteMustVisitPlace(promiseId, placeId);
      } catch (e: any) {
        console.error(e);
        alert(e?.message ?? "장소 삭제 중 오류가 발생했습니다.");
        // 필요하면 여기서 다시 fetch 해서 상태 복구도 가능
      }
    },
    [promiseId, setData]
  );

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
    onEditMustVisitPlaces,
    onDeleteMustVisitPlace,
  };
}
