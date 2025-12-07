// src/pages/promise-detail/index.tsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import PromiseMainView from "@/pages/promise-main/index.view";
import { getPromiseDetail } from "@/services/promise/promise.service";
import type { PromiseDetail } from "@/types/promise";
import { DEFAULT_PROMISE_ID } from "@/config/runtime";
import { usePromiseMainController } from "@/pages/promise-main/index";
import type { Participant } from "@/types/participant";

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
    onEditMustVisitPlaces,
    onDeleteMustVisitPlace,
    onChangeMeetingProfile,
    onToggleMeetingProfileChip,
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
      await baseOnChangeTitle(value);
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
  if (!data?.course?.items) return;

  const visitItems = data.course.items
    .filter((i) => i.type === "visit")
    .map((v, idx) => ({
      id: v.id,
      name: v.place.name,
      address: v.place.address,
      lat: v.place.lat,
      lng: v.place.lng,
      stayMinutes: v.stayMinutes,
      order: idx + 1,
    }));

  navigate(`/details/${promiseId}/course-review`, {
  state: { courseItems: visitItems},
  });
}, [data, promiseId, navigate]);


  const onAddParticipant = useCallback(() => {
    if (!promiseId) return;

    navigate(`/details/${promiseId}/participants/new`, {
      state: { from: "details" },
    });
  }, [promiseId, navigate]);

  const onEditParticipant = useCallback(
    (participant: Participant) => {
      if (!promiseId) return;

      navigate(`/details/${promiseId}/participants/new`, {
        state: {
          nameDraft: participant.name,
          selectedOrigin: participant.startAddress ?? null,
          selectedTransportation: participant.transportation ?? null,
          selectedTimes: participant.availableTimes ?? [],
          selectedPreferences: participant.preferredCategories ?? [],
          editParticipantId: participant.id,
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
      calculatingPlan={calculatingPlan}
      calculatingCourse={calculatingCourse}
      onReset={onReset}
      onEditMustVisitPlaces={onEditMustVisitPlaces}
      onDeleteMustVisitPlace={onDeleteMustVisitPlace}
      // 🔹 프로필 섹션 연결
      meetingProfile={data?.meetingProfile}
      onChangeMeetingProfile={onChangeMeetingProfile}
      onToggleMeetingProfileChip={onToggleMeetingProfileChip}
    />
  );
}
