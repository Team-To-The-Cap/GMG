// src/pages/participants/add-start/index.tsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom"; // ⬅️ 추가
import Button from "@/components/ui/button";
import styles from "./style.module.css";
import { CalendarIcon, PinIcon, HeartIcon } from "@/assets/icons/icons";

export default function AddParticipantStartPage() {
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState<string | null>(null); // ⬅️ 선택값 표시용
  const [availableTimes, setAvailableTimes] = useState<
  { start_time: string; end_time: string }[]
>([]);
  //const [transportation, setTransportation] = useState("지하철");
  //const [favActivity, setFanActivity] = useState("카페");
  //const [memberId, setMemberId] = useState<number>(0);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { promiseId } = useParams();
  const [transportation, setTransportation] = useState<string | null>(null);

  // 새 페이지에서 돌아올 때 state로 전달된 선택값을 반영
  useEffect(() => {
    const state = location.state as any;

    if (state?.selectedOrigin) {
      setOrigin(state.selectedOrigin);
      //navigate(location.pathname, { replace: true });
    }

    if (state?.selectedTransportation) {
      setTransportation(state.selectedTransportation);
    }
    if (state?.selectedTimes) {
      setAvailableTimes(state.selectedTimes);
      //navigate(location.pathname, { replace: true });
    }
    /*
    if (state?.selectedPreferences) {
      setFavActivity(state.selectedPreferences);
      navigate(location.pathname, { replace: true });
    }*/
  }, [location.state, location.pathname, navigate]);

  const openSchedulePicker = () => {
    if (!promiseId) return; // 안전하게 처리

    navigate(`/create/${promiseId}/promise-time`, {
    state: {
      nameDraft: name,
      selectedOrigin: origin, // ✅ 장소정보 유지
    },
  });
  };

  // ⬇️ 새 페이지로 이동
  const openOriginPicker = () => {
    const path = promiseId
      ? `/create/${promiseId}/participants/new/origin`
      : `/participants/new/origin`;
    // 현재 입력 중 이름 같은 값이 있으면 필요 시 state로 넘겨도 됨
    navigate(path, {
    state: {
      nameDraft: name,
      selectedTimes: availableTimes, // ✅ 일정정보 유지
    },
  });
  };

  const openPreferencePicker = () => {
    /* ... */
  };

  const submit = async () => {
    if (!promiseId) return alert("약속 ID가 없습니다.");
    if (!name.trim()) return alert("이름을 입력하세요.");

    const payload = {
      name,
      member_id: 0, // 서버 필수 필드 (임시 더미값)
      start_address: origin ?? "",
      transportation: transportation ?? "",
      fav_activity: "카페",    // 기본값 혹은 빈 문자열
      available_times: availableTimes,
    };

    console.log("전송 데이터:", payload);
    const numericId = promiseId?.replace(/\D/g, "")

    try {
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
      navigate(`/create/${promiseId}/participants`);
    } catch (error) {
      console.error(error);
      alert("참석자 저장 중 오류가 발생했습니다.");
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

      <button className={styles.rowBtn} onClick={openPreferencePicker}>
        <span className={`${styles.icon} ${styles.heartIcon}`}>
          <HeartIcon />
        </span>
        <span className={styles.rowText}>선호 입력하기</span>
      </button>

      <div className={styles.footer}>
        <Button
          variant="primary"
          size="lg"
          className={styles.saveBtn}
          disabled={!name.trim()}
          onClick={submit}
        >
          저장하기
        </Button>
      </div>
    </div>
  );
}
