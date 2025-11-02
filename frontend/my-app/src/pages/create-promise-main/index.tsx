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
    navigate("/time/time1");
  }, [promiseId, navigate]);

  const onEditPlace = useCallback(() => {
    alert("장소 수정 기능 준비 중!");
  }, [promiseId]);

  const onEditCourse = useCallback(() => {
    alert("코스 수정 기능 준비 중!");
  }, [promiseId]);

  // ✅ 새 인원 추가 버튼 핸들러
  const onAddParticipant = useCallback(() => {
    // if (promiseId) navigate(`/create/${promiseId}/participants/add`);
    alert("새 참여자 추가 기능 준비 중!");
  }, [promiseId, navigate]);

  // ✅ 약속 이름 편집(또는 이동) 핸들러
  const onEditTitle = useCallback(() => {
    alert("약속 이름 수정 기능 준비 중!");
    // 예: if (promiseId) navigate(`/create/${promiseId}/title/edit`);
  }, [promiseId, navigate]);

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
    />
  );
}
