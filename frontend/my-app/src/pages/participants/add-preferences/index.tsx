// src/pages/participants/add-preferences/index.tsx
import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/button";
import styles from "./style.module.css";
import { loadSelectedCats, type PlaceCategory } from "@/lib/user-storage";

const ALL = [
  { key: "맛집", emoji: "🍽️" },
  { key: "카페", emoji: "☕" },
  { key: "액티비티", emoji: "🎮" },
  { key: "소품샵", emoji: "🛍️" },
  { key: "문화시설", emoji: "🎭" },
  { key: "자연관광", emoji: "🌲" },
] as const;

const MAX_SELECT = 4;

export default function AddParticipantPreferencesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { promiseId } = useParams();

  const state = location.state as any;

  // 돌아갈 때 다시 세팅해줄 값들
  const [nameDraft] = useState<string>(state?.nameDraft ?? "");
  const [selectedOrigin] = useState<string | null>(
    state?.selectedOrigin ?? null
  );
  const [selectedTimes] = useState(state?.selectedTimes ?? []);
  const [selectedTransportation] = useState<string | null>(
    state?.selectedTransportation ?? null
  );

  // 현재 선택된 선호 카테고리
  const [selectedCats, setSelectedCats] = useState<PlaceCategory[]>(
    (state?.selectedPreferences as PlaceCategory[]) ?? []
  );

  // 카테고리 VM
  const categories = ALL.map(({ key, emoji }) => ({
    key,
    emoji,
    selected: selectedCats.includes(key as PlaceCategory),
  }));

  const toggleCat = useCallback((key: PlaceCategory) => {
    setSelectedCats((prev) => {
      const has = prev.includes(key);
      if (has) return prev.filter((x) => x !== key);
      if (prev.length >= MAX_SELECT) return prev;
      return [...prev, key];
    });
  }, []);

  // “내 선호 불러오기”
  const loadMyPreferences = () => {
    const myCats = loadSelectedCats();
    setSelectedCats(myCats);
  };

  // 확인(선택) 버튼
  const handleConfirm = () => {
    if (!promiseId) return;

    const segments = location.pathname.split("/");
    const mode = segments[1]; // 'details' 또는 'create'
    navigate(`/${mode}/${promiseId}/participants/new`, {
      state: {
        nameDraft,
        selectedOrigin,
        selectedTimes,
        selectedTransportation,
        selectedPreferences: selectedCats,
      },
    });
  };

  // 취소 버튼
  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>선호 입력하기</h2>

      <div className={styles.headerRow}>
        <span className={styles.subtitle}>내가 선호하는 장소 유형</span>
        <span className={styles.helper}>
          최대 {MAX_SELECT}개까지 선택 가능합니다.
        </span>
      </div>

      <div className={styles.prefCard}>
        <div className={styles.catGrid}>
          {categories.map(({ key, emoji, selected }) => (
            <button
              key={key}
              type="button"
              className={`${styles.catBtn} ${
                selected ? styles.catBtnActive : ""
              }`}
              onClick={() => toggleCat(key as PlaceCategory)}
            >
              <div className={styles.catEmoji}>{emoji}</div>
              <div className={styles.catLabel}>{key}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 내 선호 불러오기 – 가운데 작은 버튼으로 */}
      <div className={styles.myPrefWrapper}>
        <button
          type="button"
          className={styles.myPrefBtn}
          onClick={loadMyPreferences}
        >
          <span className={styles.myPrefIcon}>⭐</span>
          <span>내 선호 불러오기</span>
        </button>
      </div>

      {/* 하단 고정: 취소 / 선택 */}
      <div className={styles.footer}>
        <Button
          variant="ghost"
          size="lg"
          className={styles.footerBtn}
          onClick={handleCancel}
        >
          취소
        </Button>
        <Button
          variant="primary"
          size="lg"
          className={styles.footerBtn}
          disabled={selectedCats.length === 0}
          onClick={handleConfirm}
        >
          확인
        </Button>
      </div>
    </div>
  );
}
