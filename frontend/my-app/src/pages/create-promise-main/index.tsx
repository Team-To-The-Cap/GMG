// src/pages/create-promise-main/index.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import PromiseMainView from "@/pages/promise-main/index.view";
import {
  getPromiseDetail,
  calculateAutoPlan,
  resetPromiseOnServer,
  createEmptyPromise,
} from "@/services/promise/promise.service";
import type { PromiseDetail } from "@/types/promise";
import { DEFAULT_PROMISE_ID } from "@/config/runtime";
import {
  DRAFT_PROMISE_DATA_PREFIX,
  DRAFT_PROMISE_ID_KEY,
} from "@/assets/constants/storage";
import { usePromiseMainController } from "@/pages/promise-main/index";
import type { Participant } from "@/types/participant";

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
    onEditMustVisitPlaces,
    onDeleteMustVisitPlace,
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

        const res = await getPromiseDetail(promiseId);

        const draftRaw = localStorage.getItem(
          DRAFT_PROMISE_DATA_PREFIX + promiseId
        );

        let finalData: PromiseDetail = res;

        if (draftRaw) {
          try {
            const draft = JSON.parse(draftRaw) as PromiseDetail;

            // participants 는 항상 서버 기준으로, 그 외 draft 에서 수정한 필드만 덮어쓰도록
            const { participants: _ignoredParticipants, ...draftRest } = draft;

            finalData = {
              // 1) 서버에서 온 최신 데이터 기준
              //    (mustVisitPlaces, plan, places 등 서버 필드 유지)
              ...res,
              // 2) 그 위에 클라에서 임시로 수정해 둔 필드만 얹기
              ...draftRest,
              // 3) participants 는 다시 한 번 서버 기준으로 고정
              participants: res.participants,
            };
          } catch (err) {
            console.warn("draft JSON parse 실패, 서버 데이터 사용");
          }
        }

        if (alive) setData(finalData);
      } catch (err: any) {
        console.error(err);
        if (alive) setError(err?.message ?? "데이터 불러오기 실패");
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
      // 공통 컨트롤러 로직 사용 (여기서 성공/실패 알럿, calculatingPlan 토글까지 처리됨)
      await baseOnCalculatePlan();

      // baseOnCalculatePlan이 에러 없이 끝났다면,
      // 최신 data를 draft에만 동기화
      setData((prev) => {
        if (!prev) return prev;
        persistDraft(prev);
        return prev;
      });

      // ✅ 여기서는 "일정/장소가 계산되었습니다!" 알럿을
      //     더 이상 띄우지 않는다 (중복/오동작 방지)
    } catch (e) {
      // onCalculatePlan 내부에서 에러를 다시 던지게 바꾸지 않은 이상
      // 사실 여기로 올 일은 거의 없지만, 안전하게만 두자.
      console.error(e);
    }
  }, [promiseId, baseOnCalculatePlan, setData, persistDraft]);

  // ✅ create 전용: 저장 후, 새 "약속 추가" 화면으로 다시 진입
  const onSave = useCallback(async () => {
    if (!data) return;

    // 1) 서버에 현재 약속 저장
    await baseOnSave();

    // 2) 이 약속이 draft였다면 draft 정보 정리
    const currentId = data.id;
    const savedDraftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);
    if (savedDraftId && savedDraftId === currentId) {
      localStorage.removeItem(DRAFT_PROMISE_ID_KEY);
      localStorage.removeItem(DRAFT_PROMISE_DATA_PREFIX + savedDraftId);
    }

    // 3) BottomNav의 handleCreateClick 로직과 동일하게,
    //    "약속 추가" 화면을 다시 띄우기

    // 혹시 남아 있는 draft 가 있다면 그걸로 이동
    const draftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);
    if (draftId) {
      navigate(`/create/${draftId}`);
      return;
    }

    // 없으면 새 약속 하나 만들고 그 쪽으로 이동
    const draft = await createEmptyPromise();
    localStorage.setItem(DRAFT_PROMISE_ID_KEY, draft.id);
    navigate(`/create/${draft.id}`);
  }, [baseOnSave, data, navigate]);

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

  const onEditParticipant = useCallback(
    (participant: Participant) => {
      if (!promiseId) return;

      navigate(`/create/${promiseId}/participants/new`, {
        state: {
          nameDraft: participant.name,
          selectedOrigin: participant.startAddress ?? null,
          selectedTransportation: participant.transportation ?? null,
          selectedTimes: participant.availableTimes ?? [],
          selectedPreferences: participant.preferredCategories ?? [],
          editParticipantId: participant.id, // 수정 모드 표시
        },
      });
    },
    [promiseId, navigate]
  );

  return (
    <PromiseMainView
      loading={loading}
      error={error}
      data={data}
      onEditSchedule={onEditSchedule}
      onEditPlace={onEditPlace}
      onEditCourse={onEditCourse}
      onAddParticipant={onAddParticipant}
      onChangeTitle={onChangeTitle}
      onRemoveParticipant={onRemoveParticipant}
      onEditParticipant={onEditParticipant}
      onCalculatePlan={onCalculatePlan}
      onCalculateCourse={onCalculateCourse}
      onSave={onSave}
      saving={saving}
      isDraft={isDraft}
      onReset={onReset}
      calculatingPlan={calculatingPlan}
      calculatingCourse={calculatingCourse}
      onEditMustVisitPlaces={onEditMustVisitPlaces}
      onDeleteMustVisitPlace={onDeleteMustVisitPlace}
    />
  );
}
