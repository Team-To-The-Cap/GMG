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
  calculateAutoCourse, // ✅ 코스 자동 계산 함수 추가
} from "@/services/promise/promise.service";
import type { PromiseDetail, MeetingProfile } from "@/types/promise";

export type PromiseMainHandlers = {
  onChangeTitle: (value: string) => Promise<void>;
  onRemoveParticipant: (id: string) => Promise<void>;
  onCalculatePlan: () => Promise<void>;
  onCalculateCourse: () => Promise<void>;
  onSave: () => Promise<void>;
  onReset: () => Promise<void>;

  // 반드시 가고 싶은 장소 편집/관리 화면으로 이동
  onEditMustVisitPlaces: () => Promise<void>;
  onDeleteMustVisitPlace: (id: string) => Promise<void>;

  // 약속 분위기/목적 등 프로필 변경 (직접 patch)
  onChangeMeetingProfile: (patch: Partial<MeetingProfile>) => void;

  // 🔹 프로필 칩 토글 (뷰에서 호출)
  onToggleMeetingProfileChip: (
    field: keyof MeetingProfile,
    value: string
  ) => void;
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

// 🔹 단일 문자열 / 배열 / 빈값 모두 배열로 정규화
function normalizeMultiValue(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter((s) => !!s);
  }
  return [];
}

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
        const next = (prev.participants ?? []).filter(
          (p) => String(p.id) !== String(id)
        );
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

  // ✅ 코스 자동 계산
  const onCalculateCourse = useCallback(async () => {
    if (!promiseId) return;

    try {
      setCalculatingCourse(true);

      // 1) 백엔드에 코스 자동 생성 요청 + 최신 Meeting 불러오기
      const updated = await calculateAutoCourse(promiseId);

      // 2) 프론트 상태 갱신
      setData(updated);

      alert("코스가 계산되었습니다!");
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "코스 계산 중 오류가 발생했습니다.");
    } finally {
      setCalculatingCourse(false);
    }
  }, [promiseId, setData]);

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
      }
    },
    [promiseId, setData]
  );

  // ✅ MeetingProfile 직접 patch
  const onChangeMeetingProfile = useCallback(
    (patch: Partial<MeetingProfile>) => {
      setData((prev) => {
        if (!prev) return prev;
        const prevProfile: MeetingProfile = prev.meetingProfile ?? {};
        return {
          ...prev,
          meetingProfile: {
            ...prevProfile,
            ...patch,
          },
        };
      });
    },
    [setData]
  );

  // ✅ 프로필 칩 토글 로직 (단일/복수 선택 처리 + vibe까지 포함)
  const onToggleMeetingProfileChip = useCallback(
    (field: keyof MeetingProfile, value: string) => {
      setData((prev) => {
        if (!prev) return prev;

        const prevProfile: MeetingProfile = prev.meetingProfile ?? {};
        const isMultiField =
          field === "purpose" || field === "budget" || field === "vibe";

        if (!isMultiField) {
          // 단일 선택 필드 (예: withWhom)
          const currentVal = prevProfile[field] as string | undefined;
          const nextVal = currentVal === value ? undefined : value;

          return {
            ...prev,
            meetingProfile: {
              ...prevProfile,
              [field]: nextVal,
            } as MeetingProfile,
          };
        } else {
          // 복수 선택 필드 (purpose, budget, vibe)
          const currentArr = normalizeMultiValue(prevProfile[field]);
          const exists = currentArr.includes(value);
          const nextArr = exists
            ? currentArr.filter((v) => v !== value)
            : [...currentArr, value];

          return {
            ...prev,
            meetingProfile: {
              ...prevProfile,
              [field]: nextArr,
            } as MeetingProfile,
          };
        }
      });
    },
    [setData]
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
    onChangeMeetingProfile,
    onToggleMeetingProfileChip,
  };
}
