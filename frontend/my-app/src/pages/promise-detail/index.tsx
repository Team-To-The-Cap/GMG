// src/pages/promise-detail/index.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import CreatePromiseMainView from "./index.view";
import {
  getPromiseDetail,
  savePromiseDetail,
  deleteParticipant,
} from "@/services/promise/promise.service";
import type { PromiseDetail } from "@/types/promise";
import { DEFAULT_PROMISE_ID } from "@/config/runtime";

export default function PromiseDetailPage() {
  const { promiseId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // ✅ 저장 중 상태
  const [error, setError] = useState<string>();
  const [data, setData] = useState<PromiseDetail>();

  useEffect(() => {
    if (!promiseId) {
      // ✅ /details 페이지용 fallback 경로
      navigate(`/details/${DEFAULT_PROMISE_ID}`, { replace: true });
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
  }, []);

  const onEditSchedule = useCallback(() => {
    navigate("/time/timeresult");
  }, [navigate]);

  const onEditPlace = useCallback(() => {
    alert("장소 수정 기능 준비 중!");
  }, []);

  const onEditCourse = useCallback(() => {
    alert("코스 수정 기능 준비 중!");
  }, []);

  // ✅ 새 인원 추가 버튼 핸들러
  const onAddParticipant = useCallback(() => {
    if (!promiseId) return; // 혹시 모를 가드
    navigate(`/create/${promiseId}/participants/new`);
  }, [promiseId, navigate]);

  // 약속 이름 편집(또는 이동)
  const onEditTitle = useCallback(() => {
    alert("약속 이름 수정 기능 준비 중!");
  }, []);

  // 제목 변경(낙관적 업데이트 예시)
  const onChangeTitle = useCallback((value: string) => {
    setData((prev) => (prev ? { ...prev, title: value } : prev));
    // TODO: API PATCH (부분 저장 필요하면 여기에)
  }, []);

  // 참여자 삭제(낙관적 업데이트 + 서버 연동)
  const onRemoveParticipant = useCallback(
    async (id: string) => {
      // 1) 먼저 화면에서 제거 (낙관적 업데이트)
      setData((prev) => {
        if (!prev) return prev;
        const next = (prev.participants ?? []).filter((p) => p.id !== id);
        return { ...prev, participants: next };
      });

      // meeting id 없으면 여기까지만
      if (!promiseId) return;

      try {
        // 2) 서버에 실제 삭제 요청
        await deleteParticipant(promiseId, id);
      } catch (e: any) {
        console.error(e);
        alert(e?.message ?? "참여자 삭제 중 오류가 발생했습니다.");

        // 3) 실패 시 상태를 서버와 다시 맞춰주고 싶으면 재조회
        try {
          const fresh = await getPromiseDetail(promiseId);
          setData(fresh);
        } catch (err) {
          console.error("삭제 실패 후 재조회도 실패:", err);
        }
      }
    },
    [promiseId]
  );

  // ✅ 계산 버튼 액션
  const onCalculate = useCallback(() => {
    console.log("calculate with", data);
    alert("일정/장소/코스 계산 로직을 연결하세요!");
  }, [data]);

  // ✅ 저장 버튼 액션 (실제 서비스 호출)
  const onSave = useCallback(async () => {
    if (!data) return;
    try {
      setSaving(true);
      const saved = await savePromiseDetail(data);
      setData(saved); // mock 환경에서는 업데이트된 상태 반영
      alert("저장되었습니다!");
      // 필요하면 여기서 navigate 해서 리스트로 돌아가도 됨
      // navigate("/");
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
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
      onCalculate={onCalculate}
      onSave={onSave}
      saving={saving}
    />
  );
}
