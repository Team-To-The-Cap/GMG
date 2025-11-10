// src/lib/user-storage.ts
export type SavedPlace = { id: string; name: string; address: string };
export type Profile = { name: string; avatarUrl?: string };
export type PlaceCategory =
  | "맛집" | "카페" | "액티비티" | "소품샵" | "문화시설" | "자연관광";

export const STORAGE_KEYS = {
  profile: "mypage.profile.v1",
  places:  "mypage.places.v1",
  cats:    "mypage.selectedCats.v1",
} as const;

function safeParse<T>(s: string | null, fallback: T): T {
  try { return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; }
}

// ===== 로드 함수들 =====
export function loadProfile(): Profile {
  return safeParse<Profile>(localStorage.getItem(STORAGE_KEYS.profile), { name: "홍길동" });
}

export function loadSavedPlaces(): SavedPlace[] {
  return safeParse<SavedPlace[]>(localStorage.getItem(STORAGE_KEYS.places), []);
}

export function loadSelectedCats(): PlaceCategory[] {
  return safeParse<PlaceCategory[]>(
    localStorage.getItem(STORAGE_KEYS.cats),
    ["맛집", "카페"]
  );
}

// ===== 저장 함수들 =====
export function saveProfile(p: Profile) {
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(p));
}
export function savePlaces(places: SavedPlace[]) {
  localStorage.setItem(STORAGE_KEYS.places, JSON.stringify(places));
}
export function saveSelectedCats(cats: PlaceCategory[]) {
  localStorage.setItem(STORAGE_KEYS.cats, JSON.stringify(cats));
}
