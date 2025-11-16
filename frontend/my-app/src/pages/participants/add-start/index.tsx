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

  // ✅ 추가: 제출 중인지 여부
  const [submitting, setSubmitting] = useState(false);

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
  }, [location.state]);

  const openSchedulePicker = () => {
    if (!promiseId) return;

    navigate(`/details/${promiseId}/promise-time`, {
      state: {
        nameDraft: name,
        selectedOrigin: origin,
        selectedTransportation: transportation,
        selectedPreferences: preferredCats,
      },
    });
  };

  const openOriginPicker = () => {
    const path = promiseId
      ? `/details/${promiseId}/participants/new/origin`
      : `/participants/new/origin`;

    navigate(path, {
      state: {
        nameDraft: name,
        selectedTimes: availableTimes,
        selectedTransportation: transportation,
        selectedPreferences: preferredCats,
      },
    });
  };

  const openPreferencePicker = () => {
    if (!promiseId) return;

    navigate(`/details/${promiseId}/participants/new/preferences`, {
      state: {
        nameDraft: name,
        selectedOrigin: origin,
        selectedTimes: availableTimes,
        selectedTransportation: transportation,
        selectedPreferences: preferredCats,
      },
    });
  };

  const submit = async () => {
    if (!promiseId) return alert("약속 ID가 없습니다.");
    if (!name.trim()) return alert("이름을 입력하세요.");

    // ✅ 이미 제출 중이면 더 이상 진행하지 않음
    if (submitting) return;

    const payload: any = {
      name,
      member_id: 0,
      fav_activity: "카페",
    };

    if (origin) payload.start_address = origin;
    if (transportation) payload.transportation = transportation;
    if (availableTimes.length > 0) payload.available_times = availableTimes;

    console.log("전송 데이터:", payload);
    const numericId = promiseId.replace(/\D/g, "");

    try {
      setSubmitting(true); // 🔹 제출 시작

      const res = await fetch(
        `http://223.130.152.114:8001/meetings/${numericId}/participants/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "저장 실패");
      }

      alert("참석자 정보가 성공적으로 저장되었습니다!");
      navigate(`/details/${promiseId}`);
    } catch (error) {
      console.error(error);
      alert("참석자 저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false); // 🔹 성공/실패 상관없이 다시 풀어줌
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
          disabled={!name.trim() || submitting} // ✅ 제출 중이면 버튼 비활성화
          onClick={submit}
        >
          {submitting ? "저장 중..." : "저장하기"}
        </Button>
      </div>
    </div>
  );
}
