// src/utils/getTopBarConfig.ts
import { matchPath } from "react-router-dom";

export type TopBarConfig = {
  title: string;
  showBack: boolean;
  backTo?: string;
  showShare?: boolean; // ⬅️ 우측 공유 아이콘 표시 여부
};

export function getTopBarConfig(pathname: string): TopBarConfig {
  const m = (pattern: string, end: boolean = true) =>
    matchPath({ path: pattern, end }, pathname);

  // === 메인 탭들 ===
  if (m("/")) {
    return { title: "나의 약속", showBack: false, showShare: false };
  }

  if (m("/me")) {
    return { title: "마이페이지", showBack: false, showShare: false };
  }

  // 약속 추가 / 편집 메인
  if (m("/create/:promiseId")) {
    return {
      title: "약속 만들기",
      showBack: false,
      showShare: true, // ⬅️ 공유 버튼 ON
    };
  }

  // ✅ 약속 상세 화면
  if (m("/details/:promiseId")) {
    return {
      title: "약속 상세",
      showBack: true,
      backTo: "/", // 약속 목록으로
      showShare: true, // ⬅️ 공유 버튼 ON
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
          : "/",
        showShare: false,
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
        showShare: false,
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
        showShare: false,
      };
    }
  }

  // ✅ 반드시 가고 싶은 장소 검색 (must-visit)
  {
    const match =
      m("/create/:promiseId/must-visit/search") ||
      m("/details/:promiseId/must-visit/search");

    if (match) {
      const { promiseId } = match.params;
      return {
        title: "반드시 가고 싶은 장소",
        showBack: true,
        // 약속 메인으로 돌아가도록
        backTo: match.pattern?.path.startsWith("/create")
          ? `/create/${promiseId}`
          : `/details/${promiseId}`,
        showShare: false,
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
        // 참가자 추가 페이지로 돌아가도록
        backTo: match.pattern?.path.startsWith("/create")
          ? `/create/${promiseId}/participants/new`
          : `/details/${promiseId}/participants/new`,
        showShare: false,
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
        showShare: false,
      };
    }
  }

  // (구) 시간 선택 플로우
  if (m("/time/time1")) {
    return {
      title: "시간 선택",
      showBack: true,
      backTo: "/",
      showShare: false,
    };
  }

  {
    const match = m("/time/timeresult/:promiseId");
    if (match) {
      return {
        title: "최종 시간 선택",
        showBack: true,
        showShare: false,
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
        showShare: false,
      };
    }
  }

  // 코스 장소 미리보기 화면
{
  const match =
    m("/create/:promiseId/course-review") ||
    m("/details/:promiseId/course-review");

  if (match) {
    const { promiseId } = match.params;
    return {
      title: "코스 장소 미리보기",
      showBack: true,
      backTo: match.pattern?.path.startsWith("/create")
        ? `/create/${promiseId}`
        : `/details/${promiseId}`,
      showShare: false,
    };
  }
}

  // 매칭 안될 때 기본값
  return { title: "GMG", showBack: true, backTo: "/", showShare: false };
}
