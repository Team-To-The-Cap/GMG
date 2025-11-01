import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import CreatePromiseMainView from "./index.view";
import { getPromiseDetail } from "@/services/promise.service"; // ← 여기! (mock/http 선택은 내부에서)
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

  const onEditParticipants = useCallback(() => {}, [promiseId]);
  const onEditSchedule = useCallback(() => {navigate("/time/time1")}, [promiseId]);
  const onEditCourse = useCallback(() => {}, [promiseId]);

  return (
    <CreatePromiseMainView
      loading={loading}
      error={error}
      data={data}
      onEditParticipants={onEditParticipants}
      onEditSchedule={onEditSchedule}
      onEditCourse={onEditCourse}
    />
  );
}
