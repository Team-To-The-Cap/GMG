// src/utils/participant-place-storage.ts

export interface StoredParticipantPlace {
  id: string; // 예: "서강대학교-서울특별시 마포구..."
  name: string; // "서강대학교"
  address: string; // "서울특별시 마포구..."
}

export const PARTICIPANT_PLACES_PREFIX = "gmg.participant.places.v1:";
export const PARTICIPANT_PLACES_DRAFT_ID_KEY = "gmg.participant.places.draftId";

/**
 * 출발 장소용 draftId 확보
 * - 없으면 uuid 생성 후 localStorage에 저장
 */
function ensurePlacesDraftId(): string {
  if (typeof window === "undefined") return "server";

  const existing = window.localStorage.getItem(PARTICIPANT_PLACES_DRAFT_ID_KEY);
  if (existing) return existing;

  // uuid 생성 (crypto.randomUUID 있으면 그거 사용)
  const newId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `draft-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(PARTICIPANT_PLACES_DRAFT_ID_KEY, newId);
  return newId;
}

/**
 * 참가자 출발 장소 저장 키
 * 형식: gmg.participant.places.v1:{promiseId}:{draftId}:{participantId}
 */
export function getParticipantPlacesStorageKey(
  promiseId: string,
  participantId: string
): string {
  const draftId = ensurePlacesDraftId();
  return `${PARTICIPANT_PLACES_PREFIX}${promiseId}:${draftId}:${participantId}`;
}

/**
 * 참가자 출발 장소 목록 로드
 */
export function loadParticipantPlaces(
  promiseId: string,
  participantId: string
): StoredParticipantPlace[] {
  if (typeof window === "undefined") return [];

  const key = getParticipantPlacesStorageKey(promiseId, participantId);
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as StoredParticipantPlace[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * 참가자 출발 장소 목록 저장
 */
export function saveParticipantPlaces(
  promiseId: string,
  participantId: string,
  places: StoredParticipantPlace[]
): void {
  if (typeof window === "undefined") return;

  const key = getParticipantPlacesStorageKey(promiseId, participantId);
  window.localStorage.setItem(key, JSON.stringify(places));
}

/**
 * 특정 약속(promiseId)에 대한 **모든 참가자/드래프트** 출발 장소 캐시 삭제
 * - onSave, onReset 에서 사용
 */
export function clearAllPlacesForPromise(promiseId: string): void {
  if (typeof window === "undefined") return;

  const prefix = `${PARTICIPANT_PLACES_PREFIX}${promiseId}:`;
  const keysToDelete: string[] = [];

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    if (key.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => {
    window.localStorage.removeItem(key);
  });
}
