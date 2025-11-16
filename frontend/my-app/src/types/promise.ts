// src/types/promise.ts
export type Participant = {
  id: string;
  name: string;
  avatarUrl: string;
};

export type Schedule = {
  dateISO: string; // "2025-10-27T00:00:00+09:00"
};

export type Place = {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
};

// 이동 수단
export type TravelMode = "walk" | "subway" | "bus" | "car" | "taxi" | "bike";

// POI 카테고리(원하면 자유 문자열 추가 가능)
export type PlaceCategory =
  | "restaurant"
  | "cafe"
  | "shop"
  | "activity"
  | string;

// 기존 Place 확장(아이콘/카테고리 선택)
export type CoursePlace = Place & {
  category?: PlaceCategory;
  iconUrl?: string; // 원형 이모지/이미지 등
};

// 방문 단계
export type CourseVisit = {
  type: "visit";
  id: string; // step id
  place: CoursePlace;
  stayMinutes: number; // 우측의 90분, 60분 등
  note?: string; // 카드 하단 설명 등
};

// 이동 단계(두 방문 사이)
export type CourseTransfer = {
  type: "transfer";
  mode: TravelMode; // walk -> "도보"
  minutes: number; // 5분, 8분 등
  distanceMeters?: number; // 선택
  note?: string; // "비 올 때 경사로 우회" 등
};

// 코스 본문
export type Course = {
  title?: string; // "추천 코스" 등
  summary: {
    totalMinutes: number; // 총 소요시간
    activityMinutes: number; // 방문(stay) 합
    travelMinutes: number; // 이동 합
  };
  items: Array<CourseVisit | CourseTransfer>; // visit/transfer 교차
  generatedAtISO?: string;
  source?: "auto" | "manual" | string; // 생성 출처 표기용
};

// PromiseDetail에 적용(하위호환을 원하면 union으로)
export type PromiseDetail = {
  id: string;
  title: string;
  dday: number;
  participants: Participant[];
  schedule: Schedule;
  place?: Place;
  course: Course; // 기존 CourseList{text} 대신
  // course: Course | { text: string }; // ← 하위호환 필요시 이렇게
};
