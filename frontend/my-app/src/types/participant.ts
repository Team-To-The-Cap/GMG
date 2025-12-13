// src/types/participant.ts
import type { SavedPlace, PlaceCategory } from "@/lib/user-storage";

// 참석자의 가능한 시간 한 구간
export type ParticipantTime = {
  start_time: string;
  end_time: string;
};

export type Participant = {
  id: number | string;
  name: string;
  avatarUrl: string;

  // 백엔드에서 오는 추가 정보들 (optional)
  startAddress?: string;
  startLat?: number;
  startLng?: number;

  transportation?: string;
  favActivityRaw?: string; // "카페,맛집" 같은 원본 문자열
  preferredCategories?: string[]; // ["카페","맛집"] 처럼 split 해둔 것
  preferredSubcategories?: { [key: string]: string[] }; // 서브 카테고리 맵
  availableTimes?: ParticipantTime[];
};

/**
 * 참가자 추가/수정 플로우에서
 * react-router location.state 로 주고받는 공통 타입
 */
export type ParticipantLocationState = {
  // 이름 인풋 임시 값
  nameDraft?: string;

  // 출발 장소 관련
  savedPlaces?: SavedPlace[];
  selectedOrigin?: SavedPlace | string | null;

  // 이동수단
  selectedTransportation?: string | null;

  // 선호 카테고리 (카페, 맛집, ...)
  selectedPreferences?: PlaceCategory[];

  // 선호 서브 카테고리
  selectedSubPreferences?: { [K in PlaceCategory]?: string[] };

  // 가능한 시간들
  selectedTimes?: ParticipantTime[];

  // 수정 모드일 때 대상 참가자 id (없으면 신규 생성 모드)
  editParticipantId?: string | number;
};
