// src/pages/participants/add-start/index.tsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom"; // ⬅️ 추가
import TopBar from "@/components/ui/top-bar";
import Button from "@/components/ui/button";
import styles from "./style.module.css";
import { CalendarIcon, PinIcon, HeartIcon } from "@/assets/icons/icons";

export default function AddParticipantStartPage() {
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState<string | null>(null); // ⬅️ 선택값 표시용
  const navigate = useNavigate();
  const location = useLocation();
  const { promiseId } = useParams();

  // 새 페이지에서 돌아올 때 state로 전달된 선택값을 반영
  useEffect(() => {
    const sel = (location.state as any)?.selectedOrigin as string | undefined;
    if (sel) {
      setOrigin(sel);
      // state를 비워서 뒤로가기를 또 눌러도 재적용되지 않도록 replace
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, location.pathname, navigate]);

  const openSchedulePicker = () => {
    if (!promiseId) return; // 안전하게 처리

    navigate(`/create/${promiseId}/promise-time`, {
      state: { nameDraft: name }, // 필요 시 이름 같은 임시 데이터 전달 가능
    });
  };

  // ⬇️ 새 페이지로 이동
  const openOriginPicker = () => {
    const path = promiseId
      ? `/create/${promiseId}/participants/new/origin`
      : `/participants/new/origin`;
    // 현재 입력 중 이름 같은 값이 있으면 필요 시 state로 넘겨도 됨
    navigate(path, { state: { nameDraft: name } });
  };

  const openPreferencePicker = () => {
    /* ... */
  };

  const submit = () => {
    navigate("/participants/new");
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

      <button className={styles.rowBtn} onClick={openSchedulePicker}>
        <span className={styles.icon}>
          <CalendarIcon />
        </span>
        <span className={styles.rowText}>일정 입력하기</span>
      </button>

      <button className={styles.rowBtn} onClick={openOriginPicker}>
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
