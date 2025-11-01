import { useParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import CreatePromiseMainView from "./index.view";
import { getPromiseDetail } from "@/services/promise.service.mock";
import type { PromiseDetail } from "@/types/promise";

export default function CreatePromiseMain() {
  const { promiseId } = useParams(); // 라우트가 /create/:promiseId 라고 가정
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<PromiseDetail>();

  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        setLoading(true);
        setError(undefined);
        if (!promiseId) throw new Error("약속 ID가 없습니다.");
        const res = await getPromiseDetail(promiseId);
        if (alive) setData(res);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "알 수 없는 오류");
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [promiseId]);

  const onEditParticipants = useCallback(() => {
    // 예: 네비게이션 or 바텀시트 오픈
    // navigate(`/create/${promiseId}/participants/edit`);
  }, [promiseId]);

  const onEditSchedule = useCallback(() => {
    // navigate(`/create/${promiseId}/schedule/edit`);
  }, [promiseId]);

  const onEditCourse = useCallback(() => {
    // navigate(`/create/${promiseId}/course/edit`);
  }, [promiseId]);

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
