// src/lib/user-storage.ts

export type SavedPlace = { id: string; name: string; address: string };
export type Profile = { name: string; avatarUrl?: string };
export type PlaceCategory =
  | "맛집"
  | "카페"
  | "액티비티"
  | "소품샵"
  | "문화시설"
  | "자연관광";

export const STORAGE_KEYS = {
  profile: "mypage.profile.v1",
  places: "mypage.places.v1",
  cats: "mypage.selectedCats.v1",
} as const;

export const MAX_SAVED_PLACES = 3;

function safeParse<T>(s: string | null, fallback: T): T {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

// ===== 로드 함수들 =====
export function loadProfile(): Profile {
  return safeParse<Profile>(localStorage.getItem(STORAGE_KEYS.profile), {
    name: "홍길동",
  });
}

/**
 * 저장된 장소 불러오기
 * - 항상 최대 5개까지만 반환
 * - 타입이 이상한 값은 필터링
 */
export function loadSavedPlaces(): SavedPlace[] {
  const raw = safeParse<unknown>(localStorage.getItem(STORAGE_KEYS.places), []);

  if (!Array.isArray(raw)) return [];

  const arr: SavedPlace[] = raw
    .filter(
      (p: any) =>
        p &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        typeof p.address === "string"
    )
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      address: p.address,
    }));

  return arr.slice(0, MAX_SAVED_PLACES);
}

export function loadSelectedCats(): PlaceCategory[] {
  return safeParse<PlaceCategory[]>(localStorage.getItem(STORAGE_KEYS.cats), [
    "맛집",
    "카페",
  ]);
}

// ===== 저장 함수들 =====
export function saveProfile(p: Profile) {
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(p));
}

/**
 * 내부용: SavedPlace 배열을
 * - id 기준으로 중복 제거
 * - 순서는 전달된 배열 순서를 유지(앞쪽이 더 최신이라고 가정)
 * - 최대 5개까지만 저장
 */
function _normalizePlaces(places: SavedPlace[]): SavedPlace[] {
  const seen = new Set<string>();
  const result: SavedPlace[] = [];

  for (const p of places) {
    if (!p || typeof p.id !== "string") continue;
    if (seen.has(p.id)) continue;

    seen.add(p.id);
    result.push(p);
  }

  return result.slice(0, MAX_SAVED_PLACES);
}

/**
 * 장소 목록 저장
 * - 항상 최대 5개까지만 localStorage에 저장
 */
export function saveSavedPlaces(places: SavedPlace[]) {
  const normalized = _normalizePlaces(places);
  localStorage.setItem(STORAGE_KEYS.places, JSON.stringify(normalized));
}

/**
 * 기존에 쓰던 이름을 그대로 유지
 * - savePlaces === saveSavedPlaces
 */
export function savePlaces(places: SavedPlace[]) {
  saveSavedPlaces(places);
}

export function saveSelectedCats(cats: PlaceCategory[]) {
  localStorage.setItem(STORAGE_KEYS.cats, JSON.stringify(cats));
}
