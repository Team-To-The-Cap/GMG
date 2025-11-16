// src/pages/create-promise-main/index.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import CreatePromiseMainView from "./index.view";
import {
  getPromiseDetail,
  savePromiseDetail,
  createEmptyPromise, // ⬅️ 추가
} from "@/services/promise.service";
import type { PromiseDetail } from "@/types/promise";
import { DEFAULT_PROMISE_ID } from "@/config/runtime";

const DRAFT_PROMISE_ID_KEY = "GMG_LAST_DRAFT_PROMISE_ID";

export default function CreatePromiseMain() {
  const { promiseId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<PromiseDetail>();

  // 🔹 현재 열려 있는 약속이 "작성 중 초안"인지 판별
  const isDraft = useMemo(() => {
    if (!promiseId) return false;
    const draftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);
    return draftId === promiseId;
  }, [promiseId]);

  useEffect(() => {
    if (!promiseId) {
      // 기존 fallback 유지
      navigate(`/create/${DEFAULT_PROMISE_ID}`, { replace: true });
      return;
    }

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(undefined);

        // 1️⃣ 새 약속 생성 모드: /create/new
        if (promiseId === "new") {
          const draft = await createEmptyPromise();
          if (!alive) return;

          // draft id 기억
          localStorage.setItem(DRAFT_PROMISE_ID_KEY, draft.id);

          // URL을 새 id로 교체
          navigate(`/create/${draft.id}`, { replace: true });

          setData(draft);
          return;
        }

        // 2️⃣ 기존 약속 조회 모드
        const res = await getPromiseDetail(promiseId);
        if (alive) setData(res);
      } catch (e: any) {
        // mock-로 시작하는데 DB에 없으면, 새 초안으로 갈아타기
        if (promiseId.startsWith("mock-")) {
          try {
            const draft = await createEmptyPromise();
            if (!alive) return;

            localStorage.setItem(DRAFT_PROMISE_ID_KEY, draft.id);
            navigate(`/create/${draft.id}`, { replace: true });
            setData(draft);
            return;
          } catch (inner) {
            console.error(inner);
          }
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

  // 약속 이름 편집(낙관적 업데이트 + 초안이면 draft 저장)
  const onChangeTitle = useCallback(
    (value: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = { ...prev, title: value };
        if (isDraft) {
          localStorage.setItem(DRAFT_PROMISE_ID_KEY, next.id);
          // 필요하면 전체 draft 내용도 별도 key로 저장 가능
        }
        return next;
      });
    },
    [isDraft]
  );

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

  // ✅ 새 인원 추가 버튼
  const onAddParticipant = useCallback(() => {
    if (!promiseId) return;
    navigate(`/create/${promiseId}/participants/new`);
  }, [promiseId, navigate]);

  const onEditTitle = useCallback(() => {
    alert("약속 이름 수정 기능 준비 중!");
  }, [promiseId, navigate]);

  // 참여자 삭제(낙관적 업데이트 + 초안이면 draft 저장)
  const onRemoveParticipant = useCallback(
    (id: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          participants: (prev.participants ?? []).filter((p) => p.id !== id),
        };
        if (isDraft) {
          localStorage.setItem(DRAFT_PROMISE_ID_KEY, next.id);
        }
        return next;
      });
      // TODO: API DELETE (기존 약속일 때)
    },
    [isDraft]
  );

  // 계산 버튼
  const onCalculate = useCallback(() => {
    console.log("calculate with", data);
    alert("일정/장소/코스 계산 로직을 연결하세요!");
  }, [data, promiseId, navigate]);

  // ✅ 저장 버튼: 실제로 서버에 저장 + draft ID 정리
  const onSave = useCallback(async () => {
    if (!data) return;
    try {
      setSaving(true);
      const saved = await savePromiseDetail(data);
      setData(saved);

      // 작성 중 초안이던 경우, 이제는 "저장 완료" 상태이므로 draft ID 삭제
      const draftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);
      if (draftId && draftId === saved.id) {
        localStorage.removeItem(DRAFT_PROMISE_ID_KEY);
      }

      alert("저장되었습니다!");

      // 원하면 저장 후 상세 화면으로 이동
      // navigate(`/details/${saved.id}`);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }, [data]);

  // ✅ 초기화 버튼: ID는 유지, 내용만 비우기
  const onReset = useCallback(() => {
    if (!data) return;
    const cleared: PromiseDetail = {
      ...data,
      title: "",
      participants: [],
      place: undefined,
      // 코스/스케줄은 정책에 맞게 조정 가능
      // schedule: { dateISO: new Date().toISOString() },
      // course: { ...data.course, items: [], summary: { totalMinutes: 0, ... } }
    };
    setData(cleared);

    // 초안이면 draft 저장 내용도 업데이트 (여기서는 ID만 관리라면 noop)
    if (isDraft) {
      localStorage.setItem(DRAFT_PROMISE_ID_KEY, cleared.id);
    }
  }, [data, isDraft]);

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
      isDraft={isDraft}
      onReset={onReset}
    />
  );
}
