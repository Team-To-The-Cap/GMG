// src/pages/create-promise-main/index.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import CreatePromiseMainView from "./index.view";
import {
  getPromiseDetail,
  savePromiseDetail,
  deleteParticipant,
  calculateAutoPlan,
  updateMeetingName,
} from "@/services/promise/promise.service";
import type { PromiseDetail } from "@/types/promise";
import { DEFAULT_PROMISE_ID } from "@/config/runtime";
import {
  DRAFT_PROMISE_DATA_PREFIX,
  DRAFT_PROMISE_ID_KEY,
} from "@/assets/constants/storage";

export default function CreatePromiseMain() {
  const { promiseId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculatingPlan, setCalculatingPlan] = useState(false);
  const [calculatingCourse, setCalculatingCourse] = useState(false);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<PromiseDetail>();

  // 🔹 draft 전체를 localStorage에 저장하는 헬퍼
  const persistDraft = useCallback((detail: PromiseDetail) => {
    // 마지막으로 작업하던 약속 ID 기억
    localStorage.setItem(DRAFT_PROMISE_ID_KEY, detail.id);
    // 해당 약속의 전체 내용 저장
    localStorage.setItem(
      DRAFT_PROMISE_DATA_PREFIX + detail.id,
      JSON.stringify(detail)
    );
  }, []);

  // 🔹 현재 열려 있는 약속이 "작성 중 초안"인지 판별
  const isDraft = useMemo(() => {
    if (!promiseId) return false;
    const draftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);
    return draftId === promiseId;
  }, [promiseId]);

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

        // 1️⃣ 먼저 localStorage에 draft가 있는지 확인
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
            // draft로 복구했으면 서버 호출은 굳이 안 해도 됨
            return;
          } catch (parseErr) {
            console.error("draft JSON parse error:", parseErr);
            // 파싱 실패하면 그냥 서버에서 다시 로드
          }
        }

        // 2️⃣ draft가 없으면 서버에서 원본 조회
        const res = await getPromiseDetail(promiseId);
        if (alive) setData(res);
      } catch (e: any) {
        // 🔥 draft ID가 깨진 경우 정리
        const draftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);

        if (draftId && draftId === promiseId) {
          // draft로 기억해둔 약속인데 더 이상 불러올 수 없으면
          // 👉 draft ID + draft 데이터 삭제 후 새로고침
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
  }, [promiseId, navigate]);

  // 약속 이름 편집(낙관적 업데이트 + 서버에 바로 저장)
  const onChangeTitle = useCallback(
    async (value: string) => {
      const trimmed = value.trim();

      // 1) UI 먼저 업데이트
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, title: trimmed };
      });

      // 2) 서버 PATCH
      if (!promiseId) return;
      try {
        await updateMeetingName(promiseId, trimmed);
      } catch (e: any) {
        console.error(e);
        alert(e?.message ?? "약속 이름 저장 중 오류가 발생했습니다.");

        // (선택) 실패 시 서버 상태로 되돌리고 싶으면 재조회
        try {
          const fresh = await getPromiseDetail(promiseId);
          setData(fresh);
        } catch (err) {
          console.error("이름 저장 실패 후 재조회도 실패:", err);
        }
      }
    },
    [promiseId]
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

  // ✅ 새 인원 추가 버튼 핸들러
  const onAddParticipant = useCallback(() => {
    if (!promiseId) return; // 혹시 모를 가드

    navigate(`/create/${promiseId}/participants/new`, {
      state: {
        from: "create",
      },
    });
  }, [promiseId, navigate]);

  const onEditTitle = useCallback(() => {
    alert("약속 이름 수정 기능 준비 중!");
  }, [promiseId, navigate]);

  // 참여자 삭제(낙관적 업데이트 + draft 전체 저장 + 서버 연동)
  const onRemoveParticipant = useCallback(
    async (id: string) => {
      // 1) 먼저 화면에서 제거 (낙관적 업데이트)
      setData((prev) => {
        if (!prev) return prev;
        const next: PromiseDetail = {
          ...prev,
          participants: (prev.participants ?? []).filter((p) => p.id !== id),
        };

        // 🔥 draft 전체 저장
        persistDraft(next);

        return next;
      });

      if (!promiseId) return;

      try {
        await deleteParticipant(promiseId, id);
      } catch (e: any) {
        console.error(e);
        alert(e?.message ?? "참여자 삭제 중 오류가 발생했습니다.");

        // 실패 시 서버 상태로 다시 맞추기
        try {
          const fresh = await getPromiseDetail(promiseId);
          setData(fresh);
        } catch (err) {
          console.error("삭제 실패 후 재조회도 실패:", err);
        }
      }
    },
    [promiseId, persistDraft]
  );

  // 기존 onCalculate
  // const onCalculate = useCallback(async () => {
  const onCalculatePlan = useCallback(async () => {
    // ✅ 이름 변경
    if (!promiseId) return;

    try {
      setCalculatingPlan(true); // ✅ 변경

      const updated = await calculateAutoPlan(promiseId);
      setData(updated);

      // 🔥 계산 결과도 draft로 저장
      persistDraft(updated);

      alert("일정/장소가 계산되었습니다!"); // ✅ 문구도 일정/장소 중심으로
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "계산 중 오류가 발생했습니다.");
    } finally {
      setCalculatingPlan(false); // ✅ 변경
    }
  }, [promiseId, persistDraft]);

  const onCalculateCourse = useCallback(async () => {
    if (!data) return;

    try {
      setCalculatingCourse(true);
      // TODO: 나중에 실제 코스 계산 API 연동
      alert("코스 계산 기능은 아직 준비 중이에요.");
    } catch (e: any) {
      console.error(e);
    } finally {
      setCalculatingCourse(false);
    }
  }, [data]);

  // ✅ 저장 버튼: 실제로 서버에 저장 + draft 정리
  const onSave = useCallback(async () => {
    if (!data) return;
    try {
      setSaving(true);
      const saved = await savePromiseDetail(data);
      setData(saved);

      const draftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);
      if (draftId && draftId === saved.id) {
        localStorage.removeItem(DRAFT_PROMISE_ID_KEY);
        localStorage.removeItem(DRAFT_PROMISE_DATA_PREFIX + draftId);
      }

      alert("저장되었습니다!");
      // navigate(`/details/${saved.id}`);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }, [data]);

  // ✅ 초기화 버튼: ID는 유지, 내용만 비우고 draft 덮어쓰기
  const onReset = useCallback(() => {
    if (!data) return;
    const cleared: PromiseDetail = {
      ...data,
      title: "",
      participants: [],
      place: undefined,
      // 필요에 따라 schedule, course도 초기화 가능
      // schedule: { dateISO: new Date().toISOString() },
      // course: { ...data.course, items: [], summary: { totalMinutes: 0, ... } }
    };
    setData(cleared);

    // 🔥 초기화된 상태를 draft로 저장
    persistDraft(cleared);
  }, [data, persistDraft]);

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
      onCalculatePlan={onCalculatePlan}
      onCalculateCourse={onCalculateCourse}
      onSave={onSave}
      saving={saving}
      isDraft={isDraft}
      onReset={onReset}
      calculatingPlan={calculatingPlan}
      calculatingCourse={calculatingCourse}
    />
  );
}
