import { useCallback, useEffect, useMemo, useState } from "react";
import MyPageView from "./index.view";

export type Place = { id: string; name: string; address: string };
export type PlaceCategory =
  | "맛집" | "카페" | "액티비티" | "소품샵" | "문화시설" | "자연관광";

type Profile = { name: string; avatarUrl?: string };

const STORAGE_KEYS = {
  profile: "mypage.profile.v1",
  places: "mypage.places.v1",
  cats: "mypage.selectedCats.v1",
} as const;

const ALL = [
  { key: "맛집", emoji: "🍽️" },
  { key: "카페", emoji: "☕" },
  { key: "액티비티", emoji: "🎮" },
  { key: "소품샵", emoji: "🛍️" },
  { key: "문화시설", emoji: "🎭" },
  { key: "자연관광", emoji: "🌲" },
] as const;

function safeParse<T>(s: string | null, fallback: T): T {
  try { return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; }
}

export default function MyPage() {
  const [placeName, setPlaceName] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");

  const [profile, setProfile] = useState<Profile>({ name: "홍길동", avatarUrl: "" });
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedCats, setSelectedCats] = useState<PlaceCategory[]>(["맛집", "카페"]);
  const maxSelectable = 4;

  // 최초 로드
  useEffect(() => {
    setProfile(safeParse<Profile>(localStorage.getItem(STORAGE_KEYS.profile), { name: "홍길동" }));
    setPlaces(safeParse<Place[]>(localStorage.getItem(STORAGE_KEYS.places), []));
    setSelectedCats(
      safeParse<PlaceCategory[]>(localStorage.getItem(STORAGE_KEYS.cats), ["맛집", "카페"])
    );
  }, []);

  // UI 가공
  const categories = useMemo(
    () => ALL.map(({ key, emoji }) => ({
      key, emoji, label: key, selected: selectedCats.includes(key as PlaceCategory),
    })),
    [selectedCats]
  );

  const onToggleCategory = useCallback((key: string) => {
    setSelectedCats(prev => {
      const has = prev.includes(key as PlaceCategory);
      if (has) return prev.filter(x => x !== key);
      if (prev.length >= maxSelectable) return prev;
      return [...prev, key as PlaceCategory];
    });
  }, []);

  const onAddPlace = useCallback(() => {
    if (!placeName.trim() || !placeQuery.trim()) return;
    setPlaces(prev => [
      ...prev,
      { id: crypto.randomUUID(), name: placeName.trim(), address: placeQuery.trim() },
    ]);
    setPlaceName(""); setPlaceQuery("");
  }, [placeName, placeQuery]);

  const onRemovePlace = useCallback((id: string) => {
    setPlaces(prev => prev.filter(p => p.id !== id));
  }, []);

  const onProfileEdit = useCallback((next: Partial<Profile>) => {
    setProfile(prev => ({ ...prev, ...next }));
  }, []);

  // 저장
  const onSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
    localStorage.setItem(STORAGE_KEYS.places, JSON.stringify(places));
    localStorage.setItem(STORAGE_KEYS.cats, JSON.stringify(selectedCats));
    alert("저장했어요!");
  }, [profile, places, selectedCats]);

  return (
    <MyPageView
      title="My"
      description="자주 가는 장소와 취향을 관리해보세요."
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
