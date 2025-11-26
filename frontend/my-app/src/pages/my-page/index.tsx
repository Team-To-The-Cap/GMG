// src/pages/mypage/index.tsx (파일 경로는 네 프로젝트 구조에 맞게)
import { useCallback, useEffect, useMemo, useState } from "react";
import MyPageView from "./index.view";
import {
  loadProfile,
  loadSavedPlaces,
  loadSelectedCats,
  saveProfile,
  savePlaces,
  saveSelectedCats,
  type Profile,
  type PlaceCategory,
  type SavedPlace,
} from "@/lib/user-storage";

export type Place = SavedPlace; // 동일 필드이므로 그대로 alias

const ALL = [
  { key: "맛집", emoji: "🍽️" },
  { key: "카페", emoji: "☕" },
  { key: "액티비티", emoji: "🎮" },
  { key: "소품샵", emoji: "🛍️" },
  { key: "문화시설", emoji: "🎭" },
  { key: "자연관광", emoji: "🌲" },
] as const;

export default function MyPage() {
  const [placeName, setPlaceName] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");

  const [profile, setProfile] = useState<Profile>({
    name: "홍길동",
    avatarUrl: "",
  });
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedCats, setSelectedCats] = useState<PlaceCategory[]>([
    "맛집",
    "카페",
  ]);
  const maxSelectable = 4;

  // 최초 로드
  useEffect(() => {
    setProfile(loadProfile());
    setPlaces(loadSavedPlaces());
    setSelectedCats(loadSelectedCats());
  }, []);

  // ===== 카테고리 VM =====
  const categories = useMemo(
    () =>
      ALL.map(({ key, emoji }) => ({
        key,
        emoji,
        label: key,
        selected: selectedCats.includes(key as PlaceCategory),
      })),
    [selectedCats]
  );

  const onToggleCategory = useCallback((key: string) => {
    setSelectedCats((prev) => {
      const has = prev.includes(key as PlaceCategory);
      if (has) return prev.filter((x) => x !== key);
      if (prev.length >= maxSelectable) return prev;
      return [...prev, key as PlaceCategory];
    });
  }, []);

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
    alert("저장했어요!");
  }, [profile, selectedCats]);

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
      onSave={onSave}
    />
  );
}
