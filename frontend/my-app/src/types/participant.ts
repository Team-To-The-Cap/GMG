// src/types/participant.ts

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
  transportation?: string;
  favActivityRaw?: string; // "카페,맛집" 같은 원본 문자열
  preferredCategories?: string[]; // ["카페","맛집"] 처럼 split 해둔 것
  availableTimes?: ParticipantTime[];
};
