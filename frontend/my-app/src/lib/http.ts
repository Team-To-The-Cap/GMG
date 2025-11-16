// src/lib/http.ts

/**
 * 공용 HTTP 유틸리티
 * - BASE_URL은 .env에 설정된 VITE_API_BASE_URL 사용
 * - 모든 요청은 JSON으로 전송/파싱
 * - 에러 상태시 예외 throw
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

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
