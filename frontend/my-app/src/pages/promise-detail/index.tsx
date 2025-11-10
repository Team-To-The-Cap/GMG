import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import CreatePromiseMainView from "./index.view";
import { getPromiseDetail } from "@/services/promise.service";
import type { PromiseDetail } from "@/types/promise";
import { DEFAULT_PROMISE_ID } from "@/config/runtime";

export default function CreatePromiseMain() {
  const { promiseId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<PromiseDetail>();

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

  const onEditParticipants = useCallback(() => {
    alert("참여자 수정 기능 준비 중!");
  }, [promiseId]);

  const onEditSchedule = useCallback(() => {
    navigate("/time/timeresult");
  }, [promiseId, navigate]);

  const onEditPlace = useCallback(() => {
    alert("장소 수정 기능 준비 중!");
  }, [promiseId]);

  const onEditCourse = useCallback(() => {
    alert("코스 수정 기능 준비 중!");
  }, [promiseId]);

  // ✅ 새 인원 추가 버튼 핸들러
  // ✅ 1) onAddParticipant 만 교체
  const onAddParticipant = useCallback(() => {
    if (!promiseId) return; // 혹시 모를 가드
    navigate(`/create/${promiseId}/participants/new`);
  }, [promiseId, navigate]);

  // 약속 이름 편집(또는 이동)
  const onEditTitle = useCallback(() => {
    alert("약속 이름 수정 기능 준비 중!");
  }, [promiseId, navigate]);

  // 제목 변경(낙관적 업데이트 예시)
  const onChangeTitle = useCallback((value: string) => {
    setData((prev) => (prev ? { ...prev, title: value } : prev));
    // TODO: API PATCH
  }, []);

  // 참여자 삭제(낙관적 업데이트 예시)
  const onRemoveParticipant = useCallback((id: string) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = (prev.participants ?? []).filter((p) => p.id !== id);
      return { ...prev, participants: next };
    });
    // TODO: API DELETE
  }, []);

  // ✅ 계산 버튼 액션
  const onCalculate = useCallback(() => {
    // 여기에 일정/장소/코스 계산 트리거 로직 연결
    // 예: navigate(`/create/${promiseId}/calculate`) 또는 API 호출
    console.log("calculate with", data);
    alert("일정/장소/코스 계산 로직을 연결하세요!");
  }, [data, promiseId, navigate]);

  // ✅ 저장 버튼 액션
  const onSave = useCallback(() => {
    // 현재 data를 서버에 저장하는 로직 연결
    // 예: await savePromise(data)
    console.log("save", data);
    alert("저장 로직을 연결하세요!");
  }, [data]);

  return (
    <CreatePromiseMainView
      loading={loading}
      error={error}
      data={data}
      onEditParticipants={onEditParticipants}
      onEditSchedule={onEditSchedule}
      onEditPlace={onEditPlace}
      onEditCourse={onEditCourse}
      onAddParticipant={onAddParticipant}
      onEditTitle={onEditTitle}
      onChangeTitle={onChangeTitle}
      onRemoveParticipant={onRemoveParticipant}
      /* ↓ 추가된 두 액션 */
      onCalculate={onCalculate}
      onSave={onSave}
    />
  );
}
