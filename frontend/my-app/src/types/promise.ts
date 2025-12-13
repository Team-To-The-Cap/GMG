// src/types/promise.ts

import type { Participant } from "./participant";

/**
 * 약속의 분위기 / 목적 / 예산 / 메모 정보
 * - 백엔드 Meeting 모델의 with_whom, purpose, vibe, budget, profile_memo 와 매핑됨
 */
export type MeetingProfile = {
  // 누구와 모이나요? → 단일 선택
  withWhom?: string;

  // 어떤 목적의 자리인가요? → 복수 선택
  purpose?: string[];

  // 어떤 분위기를 원하나요? → 단일 선택
  vibe?: string;

  // 1인당 예산 → 복수 선택
  budget?: string[];

  // 얼마나 길게 만날 건가요? → 단일 선택 (분 단위)
  meetingDuration?: string; // "60", "120", "180", "240", "360", "480" 등
};

/**
 * 약속 확정 날짜
 * - 백엔드 MeetingPlan.meeting_time 의 date 부분을 감싼 구조
 */
export type Schedule = {
  dateISO: string; // e.g. "2025-10-27T00:00:00+09:00"
};

/**
 * 대표 장소(만남 장소 등)
 */
export type Place = {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
};

/**
 * Meeting 단위의 "반드시 가고 싶은 장소" 정보
 */
export type MustVisitPlace = {
  id: string;
  name: string;
  address?: string | null;
  lat?: number;
  lng?: number;
};

/**
 * 이동 수단
 */
export type TravelMode = "walk" | "subway" | "bus" | "car" | "taxi" | "bike";

/**
 * POI 카테고리 (필요시 자유 문자열 추가 가능)
 */
export type PlaceCategory =
  | "restaurant"
  | "cafe"
  | "shop"
  | "activity"
  | string;

/**
 * 코스에서 사용하는 장소 타입
 */
export type CoursePlace = Place & {
  category?: PlaceCategory;
  iconUrl?: string; // 원형 이모지/이미지 등 UI용
};

/**
 * 코스의 방문 단계
 */
export type CourseVisit = {
  type: "visit";
  id: string; // step id
  place: CoursePlace;
  stayMinutes: number; // 체류 시간 (분)
  note?: string; // 카드 하단 설명
};

/**
 * 코스의 이동 단계 (두 방문 사이)
 */
export type CourseTransfer = {
  type: "transfer";
  mode: TravelMode; // walk -> "도보" 등으로 변환 가능
  minutes: number; // 이동 시간 (분)
  distanceMeters?: number;
  note?: string;
};

/**
 * 코스 전체 구조
 */
export type Course = {
  title?: string; // "추천 코스" 등
  summary: {
    totalMinutes: number; // 총 소요 시간
    activityMinutes: number; // 방문(stay) 합
    travelMinutes: number; // 이동 합
  };
  items: Array<CourseVisit | CourseTransfer>;
  generatedAtISO?: string;
  source?: "auto" | "manual" | string;
};

/**
 * 프론트에서 사용하는 약속(Promise) 상세 타입
 * - 백엔드 MeetingResponse + 파생 정보들을 모두 하나로 모은 구조
 */
export type PromiseDetail = {
  id: string;
  title: string;
  dday?: number | null;

  participants: Participant[];

  schedule?: Schedule;
  place?: Place;
  course: Course;

  // Meeting 단위의 Must-Visit Places
  mustVisitPlaces?: MustVisitPlace[];

  // 약속의 분위기/목적/예산/메모
  meetingProfile?: MeetingProfile;
};

// Participant 타입을 여기서도 재노출
export type { Participant };
