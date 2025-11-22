// src/utils/getTopBarConfig.ts
import { matchPath } from "react-router-dom";

export type TopBarConfig = {
  title: string;
  showBack: boolean;
};

export function getTopBarConfig(pathname: string): TopBarConfig {
  const is = (pattern: string, end: boolean = true) =>
    matchPath({ path: pattern, end }, pathname) != null;

  if (is("/")) {
    return { title: "나의 약속", showBack: false };
  }

  if (is("/me")) {
    return { title: "마이페이지", showBack: false };
  }

  if (is("/create/:promiseId")) {
    return { title: "약속 만들기", showBack: false };
  }

  // ✅ 약속 상세 화면
  if (is("/details/:promiseId")) {
    return { title: "약속 상세", showBack: true };
  }

  if (
    is("/create/:promiseId/participants/new") ||
    is("/details/:promiseId/participants/new") ||
    is("/participants/new")
  ) {
    return { title: "참가자 추가", showBack: true };
  }

  if (
    is("/create/:promiseId/participants/new/origin") ||
    is("/details/:promiseId/participants/new/origin") ||
    is("/participants/new/origin")
  ) {
    return { title: "출발 장소 선택", showBack: true };
  }

  if (
    is("/create/:promiseId/participants/new/origin/search") ||
    is("/details/:promiseId/participants/new/origin/search") ||
    is("/participants/new/origin/search")
  ) {
    return { title: "출발 장소 검색", showBack: true };
  }

  if (
    is("/create/:promiseId/promise-time") ||
    is("/details/:promiseId/promise-time")
  ) {
    return { title: "만날 날짜 선택", showBack: true };
  }

  if (
    is("/create/:promiseId/participants/new/preferences") ||
    is("/details/:promiseId/participants/new/preferences")
  ) {
    return { title: "만나서 할 일 선택", showBack: true };
  }

  if (is("/time/time1")) {
    return { title: "시간 선택", showBack: true };
  }

  if (is("/time/timeresult/:promiseId")) {
    return { title: "최종 시간 선택", showBack: true };
  }
  if (
    is("/create/:promiseId/place-calculation") ||
    is("/details/:promiseId/place-calculation")
  ) {
    return { title: "최종 장소 선택", showBack: true };
  }

  // 매칭 안될 때 기본값
  return { title: "GMG", showBack: true };
}
