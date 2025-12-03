// src/pages/mypage/index.tsx (파일 경로는 네 프로젝트 구조에 맞게)
import { useCallback, useEffect, useMemo, useState } from "react";
import MyPageView from "./index.view";
import {
  loadProfile, loadSavedPlaces, loadSelectedCats, loadSelectedSubcats,
  saveProfile, savePlaces, saveSelectedCats, saveSelectedSubcats,
  type Profile, type PlaceCategory, type SavedPlace, type SelectedSubcats,
} from "@/lib/user-storage";

export type Place = SavedPlace; // 동일 필드이므로 그대로 alias

const ALL = [
  {
    key: "맛집",
    emoji: "🍽️",
    subcategories: ["한식", "일식", "중식", "양식", "고기", "해산물", "돈까스", "비건", "분식", "패스트푸드"],
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

type SelectedSubMap = SelectedSubcats;


export default function MyPage() {
  const [placeName, setPlaceName] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");

  const [profile, setProfile] = useState<Profile>({
    name: "홍길동",
    avatarUrl: "",
  });
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedCats, setSelectedCats] = useState<PlaceCategory[]>(["맛집", "카페"]);
  const [selectedSubcats, setSelectedSubcats] = useState<SelectedSubMap>({});
  const [expandedKey, setExpandedKey] = useState<PlaceCategory | null>(null);
  const maxSelectable = 4;

  // 최초 로드
  useEffect(() => {
    setProfile(loadProfile());
    setPlaces(loadSavedPlaces());
    setSelectedCats(loadSelectedCats());
    setSelectedSubcats(loadSelectedSubcats());
  }, []);

  // ===== 카테고리 VM =====
  const categories = useMemo(
    () =>
      ALL.map(({ key, emoji, subcategories }) => {
        const selected = selectedCats.includes(key as PlaceCategory);
        const selectedSubs = selectedSubcats[key as PlaceCategory] ?? [];

        return {
          key,
          emoji,
          label: key,
          selected,
          subcategories: [...subcategories],
          selectedSubs,
          expanded: expandedKey === key,
        };
      }),
    [selectedCats, selectedSubcats, expandedKey]
  );

  const onToggleCategory = useCallback(
    (key: string) => {
      setSelectedCats(prev => {
        const k = key as PlaceCategory;
        const has = prev.includes(k);

        if (has) {
          // 해제 시 서브카테고리도 같이 제거
          setSelectedSubcats(prevSubs => {
            const next = { ...prevSubs };
            delete next[k];
            return next;
          });
          setExpandedKey(prevKey => (prevKey === k ? null : prevKey));
          return prev.filter(x => x !== k);
        }

        if (prev.length >= maxSelectable) return prev; // 4개 제한

        setExpandedKey(k); // 새로 선택한 카테고리 펼치기
        return [...prev, k];
      });
    },
    [maxSelectable]
  );

  const onToggleSubcategory = useCallback(
    (catKey: string, sub: string) => {
      const k = catKey as PlaceCategory;
      setSelectedSubcats(prev => {
        const current = prev[k] ?? [];
        const has = current.includes(sub);
        const nextForCat = has
          ? current.filter(s => s !== sub)
          : [...current, sub];

        return { ...prev, [k]: nextForCat };
      });
    },
    []
  );

  // ===== 프로필 수정 =====
  const onProfileEdit = useCallback((next: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...next }));
  }, []);

  // ===== 장소 추가 (즉시 저장) =====
  const onAddPlace = useCallback(() => {
    if (!placeName.trim() || !placeQuery.trim()) {
      alert("장소 이름과 주소를 모두 입력해 주세요.");
      return;
    }
    setPlaces((prev) => {
      const next = [
        ...prev,
        {
          id: crypto?.randomUUID?.() ?? String(Date.now()),
          name: placeName.trim(),
          address: placeQuery.trim(),
        },
      ];
      savePlaces(next); // ← 즉시 localStorage 저장
      return next;
    });
    setPlaceName("");
    setPlaceQuery("");
  }, [placeName, placeQuery]);

  // ===== 장소 삭제 (즉시 저장) =====
  const onRemovePlace = useCallback((id: string) => {
    setPlaces((prev) => {
      const next = prev.filter((p) => p.id !== id);
      savePlaces(next);
      return next;
    });
  }, []);

  // ===== 저장하기: 프로필/카테고리만 저장(장소는 즉시 저장했음) =====
  const onSave = useCallback(() => {
    saveProfile(profile);
    saveSelectedCats(selectedCats);
    saveSelectedSubcats(selectedSubcats);
    alert("저장했어요!");
  }, [profile, selectedCats, selectedSubcats]);

  return (
    <MyPageView
      title="My"
      description="자주 가는 장소와 취향을 관리해요."
      profile={profile}
      onProfileEdit={onProfileEdit}
      placeName={placeName}
      onChangePlaceName={setPlaceName}
      placeQuery={placeQuery}
      onChangePlaceQuery={setPlaceQuery}
      onAddPlace={onAddPlace}
      places={places}
      onRemovePlace={onRemovePlace}
      categories={categories}
      onToggleCategory={onToggleCategory}
      onToggleSubcategory={onToggleSubcategory}

      /* 저장 버튼 */
      onSave={onSave}
    />
  );
}
