// src/lib/http.ts

/**
 * 공용 HTTP 유틸리티
 * - BASE_URL은 .env에 설정된 VITE_API_BASE_URL 사용
 * - 모든 요청은 JSON으로 전송/파싱
 * - 에러 상태시 예외 throw
 */

// 캡시터(WebView)에서 돌고 있는지 간단히 판단
const isCapacitor =
  typeof window !== "undefined" && window.location.protocol === "capacitor:";

// 환경 변수에서 API 설정 가져오기
const API_HOST = import.meta.env.VITE_API_HOST || "211.188.55.98";
const API_PORT = import.meta.env.VITE_API_PORT || "8001";
const API_BASE_URL_FULL = `http://${API_HOST}:${API_PORT}`;

// 환경별 기본 BASE_URL
const DEFAULT_BASE_URL = isCapacitor
  ? API_BASE_URL_FULL // 🔥 iOS/Android에서 사용할 백엔드 주소 (환경 변수 기반)
  : "/api"; // 브라우저(dev/prod)에서는 기존처럼 프록시/리버스프록시 사용

// 최종 BASE_URL: .env 값이 있으면 우선, 없으면 위 기본값 사용
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL;

/** 공용 request 함수 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...init,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} ${msg}`);
  }

  // 204 No Content 는 바로 undefined 반환
  if (res.status === 204) {
    return undefined as T;
  }

  // 그 외에는 text()로 읽어 보고, 비어 있으면 undefined 반환
  const text = await res.text().catch(() => "");
  if (!text) {
    return undefined as T;
  }

  // JSON 응답 파싱
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response from ${url}`);
  }
}

/** JSON POST 요청 */
async function post<T, B = unknown>(
  path: string,
  body: B,
  init?: RequestInit
): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
    ...init,
  });
}

/** JSON PUT 요청 */
async function put<T, B = unknown>(
  path: string,
  body: B,
  init?: RequestInit
): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    body: JSON.stringify(body),
    ...init,
  });
}

/** DELETE 요청 */
async function del<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, { method: "DELETE", ...init });
}

/** http 모듈 export */
export const http = {
  request,
  post,
  put,
  delete: del,
};
