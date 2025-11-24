// src/pages/participants/add-start/index.tsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import Button from "@/components/ui/button";
import styles from "./style.module.css";
import { CalendarIcon, PinIcon, HeartIcon } from "@/assets/icons/icons";
import type { PlaceCategory } from "@/lib/user-storage";

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

  // ✅ 참가자 "임시 초안"용 draftId (신규 플로우에서만 의미 있음)
  const [draftId] = useState<string | null>(() => {
    const state = location.state as any;

    // 이미 있는 참가자 수정 중이면 draftId는 의미 없음
    if (state?.editParticipantId != null) {
      return state?.draftId ?? null;
    }

    // 새 참가자 플로우인데, 이전 단계에서 이미 draftId가 있었다면 그대로 재사용
    if (state?.draftId) {
      return state.draftId as string;
    }

    // 완전 새로운 플로우라면 새로 생성
    const random =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? (crypto as any).randomUUID()
        : `${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;

    return `draft-${random}`;
  });

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

    // 🔥 여기서 한 번만 editParticipantId를 고정
    if (state?.editParticipantId !== undefined) {
      setEditParticipantId(state.editParticipantId);
    }
  }, [location.state]);

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
        selectedTimes: availableTimes, // 🔹 기존 날짜들도 같이 넘기기
        editParticipantId, // 수정 모드면 그대로
        draftId, // 🔹 새 참가자 플로우 식별용
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
        draftId, // 🔹 여기서도 같이 넘김
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
        draftId, // 🔹 유지
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

      // 현재 경로에서 create / details 뽑아서 원래 약속 페이지로 복귀
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
