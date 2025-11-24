// src/pages/participants/add-start/index.tsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import Button from "@/components/ui/button";
import styles from "./style.module.css";
import { CalendarIcon, PinIcon, HeartIcon } from "@/assets/icons/icons";
import type { PlaceCategory } from "@/lib/user-storage";

function createDraftId() {
  // crypto.randomUUID 지원 안 되는 옛 브라우저 대비 fallback
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `draft-${crypto.randomUUID()}`;
  }
  return `draft-${Math.random().toString(36).slice(2)}`;
}

export default function AddParticipantStartPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { promiseId } = useParams();

  const [name, setName] = useState("");
  const [origin, setOrigin] = useState<string | null>(null);
  const [availableTimes, setAvailableTimes] = useState<
    { start_time: string; end_time: string }[]
  >([]);
  const [transportation, setTransportation] = useState<string | null>(null);
  const [preferredCats, setPreferredCats] = useState<PlaceCategory[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // ✅ 수정 모드인지 구분하기 위한 id (null이면 신규 생성)
  const [editParticipantId, setEditParticipantId] = useState<
    string | number | null
  >(null);

  // ✅ 이 참가자 전용 draft-id (신규 참가자일 때만 사용)
  //    - location.state.participantDraftId가 있으면 재사용
  //    - 없으면 최초 진입 시 새로 생성해서 끝까지 고정
  const [participantDraftId, setParticipantDraftId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const state = location.state as any;

    if (state?.nameDraft !== undefined) {
      setName(state.nameDraft);
    }
    if (state?.selectedOrigin) {
      setOrigin(state.selectedOrigin);
    }
    if (state?.selectedTransportation) {
      setTransportation(state.selectedTransportation);
    }
    if (state?.selectedTimes) {
      setAvailableTimes(state.selectedTimes);
    }
    if (state?.selectedPreferences) {
      setPreferredCats(state.selectedPreferences as PlaceCategory[]);
    }

    if (state?.editParticipantId !== undefined) {
      // 🔹 수정 모드: 서버 participant id 사용
      setEditParticipantId(state.editParticipantId);
      // 수정 모드에서는 draft-id 필요 없음
      setParticipantDraftId(null);
    } else {
      // 🔹 신규 참가자: 기존 state에 draft-id가 있으면 재사용, 없으면 새로 생성
      if (state?.participantDraftId) {
        setParticipantDraftId(state.participantDraftId);
      } else {
        const newDraftId = createDraftId();
        setParticipantDraftId(newDraftId);
      }
    }
  }, [location.state]);

  // 이 참가자를 대표하는 key 값 (프론트/로컬 전용)
  // - 수정 모드: "id-111"
  // - 신규 모드: "draft-xxxx"
  const participantKeyBase = useMemo(() => {
    if (editParticipantId !== null && editParticipantId !== undefined) {
      return `id-${String(editParticipantId)}`;
    }
    return participantDraftId ?? "draft-unknown";
  }, [editParticipantId, participantDraftId]);

  const openSchedulePicker = () => {
    if (!promiseId) return;

    const segments = location.pathname.split("/");
    const mode = segments[1]; // 'details' 또는 'create'

    navigate(`/${mode}/${promiseId}/promise-time`, {
      state: {
        nameDraft: name,
        selectedOrigin: origin,
        selectedTransportation: transportation,
        selectedPreferences: preferredCats,
        selectedTimes: availableTimes,
        editParticipantId,
        participantDraftId, // ✅ 새 화면으로도 draft-id 전달
      },
    });
  };

  const openOriginPicker = () => {
    const segments = location.pathname.split("/");
    const mode = segments[1]; // 'details' 또는 'create'

    const path = promiseId
      ? `/${mode}/${promiseId}/participants/new/origin`
      : `/participants/new/origin`;

    navigate(path, {
      state: {
        nameDraft: name,
        selectedOrigin: origin,
        selectedTimes: availableTimes,
        selectedTransportation: transportation,
        selectedPreferences: preferredCats,
        editParticipantId,
        participantDraftId, // ✅ origin 페이지에서도 사용
      },
    });
  };

  const openPreferencePicker = () => {
    if (!promiseId) return;

    const segments = location.pathname.split("/");
    const mode = segments[1]; // 'details' 또는 'create'
    navigate(`/${mode}/${promiseId}/participants/new/preferences`, {
      state: {
        nameDraft: name,
        selectedOrigin: origin,
        selectedTimes: availableTimes,
        selectedTransportation: transportation,
        selectedPreferences: preferredCats,
        editParticipantId,
        participantDraftId, // ✅ 유지
      },
    });
  };

  const submit = async () => {
    if (!promiseId) return alert("약속 ID가 없습니다.");
    if (!name.trim()) return alert("이름을 입력하세요.");
    if (submitting) return;

    const payload: any = {
      name,
      member_id: 0,
      start_address: origin ?? "",
      transportation: transportation ?? "",
      fav_activity: preferredCats.length > 0 ? preferredCats.join(",") : "카페",
      available_times: availableTimes,
    };

    const numericMeetingId = promiseId.replace(/\D/g, "");

    try {
      setSubmitting(true);

      let res: Response;

      if (editParticipantId !== null && editParticipantId !== undefined) {
        // ✅ 수정 모드 → PATCH /meetings/{meeting_id}/participants/{participant_id}
        const numericParticipantId = String(editParticipantId).replace(
          /\D/g,
          ""
        );

        res = await fetch(
          `http://223.130.152.114:8001/meetings/${numericMeetingId}/participants/${numericParticipantId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              accept: "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        // ✅ 신규 생성 모드 → POST /meetings/{meeting_id}/participants/
        res = await fetch(
          `http://223.130.152.114:8001/meetings/${numericMeetingId}/participants/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              accept: "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      }

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "저장 실패");
      }

      const segments = location.pathname.split("/");
      const mode = segments[1];
      const id = segments[2];

      navigate(`/${mode}/${id}`, { replace: true });
    } catch (error) {
      console.error(error);
      alert("참석자 저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="name">
        이름 *
      </label>
      <input
        id="name"
        className={styles.input}
        placeholder="이름을 입력하세요"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {/* 일정 입력하기 */}
      <button
        className={`${styles.rowBtn} ${
          availableTimes.length > 0 ? styles.active : ""
        }`}
        onClick={openSchedulePicker}
      >
        <span className={styles.icon}>
          <CalendarIcon />
        </span>
        <span className={styles.rowText}>
          일정 입력하기{availableTimes.length > 0 ? " ✓" : ""}
        </span>
      </button>

      {/* 출발장소 입력하기 */}
      <button
        className={`${styles.rowBtn} ${origin ? styles.active : ""}`}
        onClick={openOriginPicker}
      >
        <span className={styles.icon}>
          <PinIcon />
        </span>
        <span className={styles.rowText}>
          출발장소 입력하기{origin ? ` · ${origin}` : ""}
        </span>
      </button>

      {/* 선호 입력하기 */}
      <button className={styles.rowBtn} onClick={openPreferencePicker}>
        <span className={`${styles.icon} ${styles.heartIcon}`}>
          <HeartIcon />
        </span>
        <span className={styles.rowText}>
          선호 입력하기
          {preferredCats.length > 0 ? ` · ${preferredCats.join(", ")}` : ""}
        </span>
      </button>

      <div className={styles.footer}>
        <Button
          variant="primary"
          size="lg"
          className={styles.saveBtn}
          disabled={!name.trim() || submitting}
          onClick={submit}
        >
          {submitting ? "저장 중..." : "저장하기"}
        </Button>
      </div>
    </div>
  );
}
