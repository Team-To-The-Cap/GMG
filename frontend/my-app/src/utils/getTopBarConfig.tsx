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
    return { title: "새로운 약속 추가", showBack: false };
  }

  if (is("/create/:promiseId/participants/new") || is("/participants/new")) {
    return { title: "참가자 추가", showBack: true };
  }

  if (
    is("/create/:promiseId/participants/new/origin") ||
    is("/participants/new/origin")
  ) {
    return { title: "출발 장소 선택", showBack: true };
  }

  if (
    is("/create/:promiseId/participants/new/origin/search") ||
    is("/participants/new/origin/search")
  ) {
    return { title: "출발 장소 검색", showBack: true };
  }

  if (is("/time/time1")) {
    return { title: "시간 선택", showBack: true };
  }

  if (is("/time/timeresult")) {
    return { title: "시간 추천 결과", showBack: true };
  }

  // 매칭 안될 때 기본값
  return { title: "GMG", showBack: true };
}
