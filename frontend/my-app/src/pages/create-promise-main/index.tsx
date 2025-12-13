// src/pages/create-promise-main/index.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import PromiseMainView from "@/pages/promise-main/index.view";
import {
  getPromiseDetail,
  resetPromiseOnServer,
  createEmptyPromise,
} from "@/services/promise/promise.service";
import type { PromiseDetail, MeetingProfile } from "@/types/promise";
import { DEFAULT_PROMISE_ID } from "@/config/runtime";
import {
  DRAFT_PROMISE_DATA_PREFIX,
  DRAFT_PROMISE_ID_KEY,
} from "@/assets/constants/storage";
import { usePromiseMainController } from "@/pages/promise-main/index";
import type { Participant } from "@/types/participant";

// 🔹 새로 추가: 출발 장소 캐시 정리 유틸
import { clearAllPlacesForPromise } from "@/utils/participant-place-storage";

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
    onEditMustVisitPlaces,
    onDeleteMustVisitPlace,
    onChangeMeetingProfile: baseOnChangeMeetingProfile,
    onToggleMeetingProfileChip,
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
        const msg = String(err?.message ?? "");

        if (!alive) return;

        // ✅ 서버에 Meeting 이 없는 경우(404) → 깨진 드래프트로 보고 새 약속 생성
        if (msg.includes("404") && msg.includes("Meeting not found")) {
          try {
            const savedDraftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);
            if (savedDraftId && savedDraftId === promiseId) {
              localStorage.removeItem(DRAFT_PROMISE_ID_KEY);
              localStorage.removeItem(DRAFT_PROMISE_DATA_PREFIX + savedDraftId);
            }

            const newMeeting = await createEmptyPromise();
            if (!alive) return;

            localStorage.setItem(DRAFT_PROMISE_ID_KEY, newMeeting.id);
            setData(newMeeting);
            setError(undefined);

            if (newMeeting.id !== promiseId) {
              navigate(`/create/${newMeeting.id}`, { replace: true });
            }
          } catch (err2: any) {
            console.error(err2);
            if (alive)
              setError(
                err2?.message ?? "데이터 불러오기 실패 (새 약속 생성 실패)"
              );
          }
        } else {
          setError(msg || "데이터 불러오기 실패");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [promiseId, navigate, setLoading, setError]);

  // ✅ create 전용: 제목 변경 시 draft도 반영
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
          participants: (prev.participants ?? []).filter(
            (p) => String(p.id) !== String(id)
          ),
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
      await baseOnCalculatePlan();

      setData((prev) => {
        if (!prev) return prev;
        persistDraft(prev);
        return prev;
      });
    } catch (e) {
      console.error(e);
    }
  }, [promiseId, baseOnCalculatePlan, setData, persistDraft]);

  // ✅ create 전용: 약속 프로필 변경 + draft 반영
  const onChangeMeetingProfile = useCallback(
    (patch: Partial<MeetingProfile>) => {
      // 1) 공통 컨트롤러 로직으로 state 변경
      baseOnChangeMeetingProfile(patch);

      // 2) draft에도 반영
      setData((prev) => {
        if (!prev) return prev;
        const prevProfile: MeetingProfile = prev.meetingProfile ?? {};
        const next: PromiseDetail = {
          ...prev,
          meetingProfile: {
            ...prevProfile,
            ...patch,
          },
        };
        persistDraft(next);
        return next;
      });
    },
    [baseOnChangeMeetingProfile, setData, persistDraft]
  );

  // ✅ create 전용: 저장 후, 새 "약속 추가" 화면으로 다시 진입
  const onSave = useCallback(async () => {
    if (!data) return;

    await baseOnSave();

    const currentId = data.id;
    const savedDraftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);
    if (savedDraftId && savedDraftId === currentId) {
      localStorage.removeItem(DRAFT_PROMISE_ID_KEY);
      localStorage.removeItem(DRAFT_PROMISE_DATA_PREFIX + savedDraftId);
    }

    clearAllPlacesForPromise(currentId);

    const draftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);
    if (draftId) {
      navigate(`/create/${draftId}`);
      return;
    }

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

      clearAllPlacesForPromise(cleared.id);

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
          selectedSubPreferences: participant.preferredSubcategories ?? {},
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
      // 🔹 프로필 섹션 연결
      meetingProfile={data?.meetingProfile}
      onChangeMeetingProfile={onChangeMeetingProfile}
      onToggleMeetingProfileChip={onToggleMeetingProfileChip}
    />
  );
}
