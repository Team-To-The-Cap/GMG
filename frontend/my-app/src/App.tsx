import { Routes, Route, Navigate } from "react-router-dom";

// pages
import Home from "@/pages/home";
import CreatePromiseMain from "@/pages/create-promise-main";
import MyPage from "@/pages/my-page";

// components
import BottomNav from "@/components/layout/bottom-nav";

// 테스트를 위한 demo mock 파일
const DEFAULT_PROMISE_ID = "demo-1";

export default function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* /create 로 오면 자동 보정 */}
        <Route
          path="/create"
          element={<Navigate to={`/create/${DEFAULT_PROMISE_ID}`} replace />}
        />

        {/* 실제 페이지 */}
        <Route path="/create/:promiseId" element={<CreatePromiseMain />} />

        <Route path="/me" element={<MyPage />} />
      </Routes>

      <BottomNav />
    </div>
  );
}
