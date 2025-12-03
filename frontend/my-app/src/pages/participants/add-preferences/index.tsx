import { useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/button";
import styles from "./style.module.css";
import {
  loadSelectedCats,
  loadSelectedSubcats,
  type PlaceCategory,
  type SelectedSubcats,
} from "@/lib/user-storage";

// My 페이지와 동일한 카테고리 + 세부유형
const ALL = [
  {
    key: "맛집",
    emoji: "🍽️",
    subcategories: [
      "한식",
      "일식",
      "중식",
      "양식",
      "고기",
      "해산물",
      "돈까스",
      "비건",
      "분식",
      "패스트푸드",
    ],
  },
  {
    key: "카페",
    emoji: "☕",
    subcategories: ["브런치", "디저트", "빵집", "스터디", "애견"],
  },
  {
    key: "액티비티",
    emoji: "🎮",
    subcategories: ["방탈출", "보드게임", "실내스포츠", "공방", "놀이공원", "스포츠"],
  },
  {
    key: "휴식",
    emoji: "🛀",
    subcategories: ["찜질방", "마사지", "만화카페", "수면카페"],
  },
  {
    key: "쇼핑",
    emoji: "🛍️",
    subcategories: ["백화점", "아울렛", "전통시장", "편집숍", "소품샵", "서점", "문구"],
  },
  {
    key: "문화시설",
    emoji: "🎭",
    subcategories: ["영화관", "박물관", "도서관", "갤러리"],
  },
  {
    key: "자연관광",
    emoji: "🌲",
    subcategories: ["공원", "산", "바다", "캠핑", "전망대"],
  },
  {
    key: "술자리",
    emoji: "🍺",
    subcategories: ["포차", "펍", "와인바", "칵테일바", "이자카야"],
  },
] as const;

const MAX_SELECT = 4;

// 서브카테 맵 타입 (My에서 쓰는 SelectedSubcats 그대로 사용)
type SelectedSubMap = SelectedSubcats;

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

  // 수정 모드일 때 참가자 id 유지
  const [editParticipantId] = useState<string | number | undefined>(
    state?.editParticipantId
  );

  // 메인 카테고리 선택
  const [selectedCats, setSelectedCats] = useState<PlaceCategory[]>(
    (state?.selectedPreferences as PlaceCategory[]) ?? []
  );

  // 서브카테고리 선택
  const [selectedSubcats, setSelectedSubcats] = useState<SelectedSubMap>(
    (state?.selectedSubPreferences as SelectedSubMap) ?? {}
  );

  // UI용 카테고리 뷰 모델
  const categories = ALL.map(({ key, emoji, subcategories }) => {
    const k = key as PlaceCategory;
    const selected = selectedCats.includes(k);
    const selectedSubs = selectedSubcats[k] ?? [];

    return {
      key: k,
      emoji,
      selected,
      subcategories: [...subcategories],
      selectedSubs,
    };
  });

  // 메인 카테고리 토글
  const toggleCat = useCallback((key: PlaceCategory) => {
    setSelectedCats((prev) => {
      const has = prev.includes(key);

      if (has) {
        // 해제 시 해당 카테고리의 서브 선택도 같이 제거
        setSelectedSubcats((prevSubs) => {
          const { [key]: _, ...rest } = prevSubs;
          return rest;
        });
        return prev.filter((x) => x !== key);
      }

      if (prev.length >= MAX_SELECT) return prev;
      return [...prev, key];
    });
  }, []);

  // 서브카테고리 토글
  const toggleSubcat = useCallback((catKey: PlaceCategory, sub: string) => {
    setSelectedSubcats((prev) => {
      const current = prev[catKey] ?? [];
      const has = current.includes(sub);

      const nextForCat = has
        ? current.filter((s) => s !== sub)
        : [...current, sub];

      return {
        ...prev,
        [catKey]: nextForCat,
      };
    });
  }, []);

  // “내 선호 불러오기” → My 페이지에서 저장한 메인 + 서브 선호 복사
  const loadMyPreferences = () => {
    const myCats = loadSelectedCats();
    const mySubs = loadSelectedSubcats();
    setSelectedCats(myCats);
    setSelectedSubcats(mySubs);
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

        // 메인 + 서브 선호 모두 넘김
        selectedPreferences: selectedCats,
        selectedSubPreferences: selectedSubcats,

        editParticipantId,
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
        {/* 메인 + 서브카테 구조 (My 페이지와 유사) */}
        <div className={styles.prefList}>
          {categories.map((c) => (
            <div key={c.key} className={styles.prefItem}>
              {/* 메인 카테고리 버튼 */}
              <button
                type="button"
                className={`${styles.catBtn} ${
                  c.selected ? styles.catBtnActive : ""
                }`}
                onClick={() => toggleCat(c.key as PlaceCategory)}
              >
                <div className={styles.catBtnInner}>
                  <span className={styles.catEmoji}>{c.emoji}</span>
                  <span className={styles.catLabel}>{c.key}</span>
                  {c.selectedSubs.length > 0 && (
                    <span className={styles.prefCount}>
                      ({c.selectedSubs.length})
                    </span>
                  )}
                </div>
              </button>

              {/* 서브카테고리 칩들 */}
              {c.selected && (
                <div className={styles.subWrap}>
                  {c.subcategories.map((sub) => {
                    const isSelected = c.selectedSubs.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        className={`${styles.subChip} ${
                          isSelected ? styles.subChipSelected : ""
                        }`}
                        onClick={() => toggleSubcat(c.key as PlaceCategory, sub)}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 내 선호 불러오기 */}
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