export const RUNTIME = {
  TEST_MODE: import.meta.env.VITE_TEST_MODE === "true",
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? "/api",
};

// 개발 기본 mock id (여러 곳에서 쓰면 같이 보관)
export const DEFAULT_PROMISE_ID = "demo-1";
