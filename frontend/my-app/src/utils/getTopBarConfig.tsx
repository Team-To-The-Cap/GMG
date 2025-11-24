// src/utils/getTopBarConfig.ts
import { matchPath } from "react-router-dom";

export type TopBarConfig = {
  title: string;
  showBack: boolean;
  backTo?: string; // ✅ 논리적인 "이전 페이지" 경로
};

export function getTopBarConfig(pathname: string): TopBarConfig {
  const m = (pattern: string, end: boolean = true) =>
    matchPath({ path: pattern, end }, pathname);

  // === 메인 탭들 ===
  if (m("/")) {
    return { title: "나의 약속", showBack: false };
  }

  if (m("/me")) {
    return { title: "마이페이지", showBack: false };
  }

  if (m("/create/:promiseId")) {
    return {
      title: "약속 만들기",
      showBack: false,
    };
  }

  // ✅ 약속 상세 화면
  if (m("/details/:promiseId")) {
    return {
      title: "약속 상세",
      showBack: true,
      backTo: "/", // 약속 목록으로
    };
  }

  // === 참가자 추가 플로우 ===
  {
    const match =
      m("/create/:promiseId/participants/new") ||
      m("/details/:promiseId/participants/new") ||
      m("/participants/new");

    if (match) {
      const { promiseId } = match.params;
      return {
        title: "참가자 추가",
        showBack: true,
        // create 플로우 vs details 플로우 vs 단독 진입
        backTo: match.pattern?.path.startsWith("/create")
          ? `/create/${promiseId}`
          : match.pattern?.path.startsWith("/details")
          ? `/details/${promiseId}`
          : "/", // 단독 진입 시 기본값
      };
    }
  }

  // 출발 장소 선택
  {
    const match =
      m("/create/:promiseId/participants/new/origin") ||
      m("/details/:promiseId/participants/new/origin") ||
      m("/participants/new/origin");

    if (match) {
      const { promiseId } = match.params;
      return {
        title: "출발 장소 선택",
        showBack: true,
        // 이전 단계: 참가자 추가
        backTo: match.pattern?.path.startsWith("/create")
          ? `/create/${promiseId}/participants/new`
          : match.pattern?.path.startsWith("/details")
          ? `/details/${promiseId}/participants/new`
          : "/participants/new",
      };
    }
  }

  // 출발 장소 검색
  {
    const match =
      m("/create/:promiseId/participants/new/origin/search") ||
      m("/details/:promiseId/participants/new/origin/search") ||
      m("/participants/new/origin/search");

    if (match) {
      const { promiseId } = match.params;
      return {
        title: "출발 장소 검색",
        showBack: true,
        // 이전 단계: 출발 장소 선택
        backTo: match.pattern?.path.startsWith("/create")
          ? `/create/${promiseId}/participants/new/origin`
          : match.pattern?.path.startsWith("/details")
          ? `/details/${promiseId}/participants/new/origin`
          : "/participants/new/origin",
      };
    }
  }

  // 만날 날짜 선택
  {
    const match =
      m("/create/:promiseId/promise-time") ||
      m("/details/:promiseId/promise-time");

    if (match) {
      const { promiseId } = match.params;
      return {
        title: "만날 날짜 선택",
        showBack: true,
        // 🔥 약속 메인으로 가는 게 아니라,
        // 참가자 추가 페이지로 돌아가도록 수정
        backTo: match.pattern?.path.startsWith("/create")
          ? `/create/${promiseId}/participants/new`
          : `/details/${promiseId}/participants/new`,
      };
    }
  }
  // 만나서 할 일 선택
  {
    const match =
      m("/create/:promiseId/participants/new/preferences") ||
      m("/details/:promiseId/participants/new/preferences");

    if (match) {
      const { promiseId } = match.params;
      return {
        title: "만나서 할 일 선택",
        showBack: true,
        backTo: match.pattern?.path.startsWith("/create")
          ? `/create/${promiseId}/participants/new`
          : `/details/${promiseId}/participants/new`,
      };
    }
  }

  // (구) 시간 선택 플로우
  if (m("/time/time1")) {
    return {
      title: "시간 선택",
      showBack: true,
      backTo: "/", // 현재는 진입점이 다양할 수 있어서 기본값 유지
    };
  }

  {
    const match = m("/time/timeresult/:promiseId");
    if (match) {
      const { promiseId } = match.params;
      return {
        title: "최종 시간 선택",
        showBack: true,
        // 직전 스텝으로 돌려보내는 흐름
        backTo: "/time/time1",
      };
    }
  }

  // 최종 장소 선택 (meeting center 계산 결과 화면)
  {
    const match =
      m("/create/:promiseId/place-calculation") ||
      m("/details/:promiseId/place-calculation");
    if (match) {
      const { promiseId } = match.params;
      return {
        title: "최종 장소 선택",
        showBack: true,
        // 약속 메인으로 돌아가는 흐름 유지
        backTo: match.pattern?.path.startsWith("/create")
          ? `/create/${promiseId}`
          : `/details/${promiseId}`,
      };
    }
  }

  // 매칭 안될 때 기본값
  return { title: "GMG", showBack: true, backTo: "/" };
}
