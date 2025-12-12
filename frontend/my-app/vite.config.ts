// vite.config.ts
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 환경 변수에서 API 포트 가져오기 (기본값: 8001)
const API_PORT = process.env.VITE_API_PORT || "8001";
const API_HOST = process.env.VITE_API_HOST || "211.188.55.98";
const API_BASE_URL = `http://${API_HOST}:${API_PORT}`;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    proxy: {
      // 개발 환경에서 /api 요청을 백엔드로 프록시
      "/api": {
        target: API_BASE_URL, // 환경 변수로 설정 가능
        changeOrigin: true,
        //rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
