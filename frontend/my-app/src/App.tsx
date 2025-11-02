// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";

// pages
import Home from "@/pages/home";
import CreatePromiseMain from "@/pages/create-promise-main";
import MyPage from "@/pages/my-page";
import { Time as Time1 } from "@/pages/promise-time/Time";
import AddParticipantStartPage from "@/pages/participants/add-start";

// components
import BottomNav from "@/components/layout/bottom-nav";

// 전역 런타임 플래그/기본 ID
import { RUNTIME, DEFAULT_PROMISE_ID } from "@/config/runtime";

export default function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* TEST_MODE에서만 /create → /create/:id 로 보정 */}
        {RUNTIME.TEST_MODE && (
          <Route
            path="/create"
            element={<Navigate to={`/create/${DEFAULT_PROMISE_ID}`} replace />}
          />
        )}

        {/* 약속 상세 */}
        <Route path="/create/:promiseId" element={<CreatePromiseMain />} />

        {/* 참가자 추가 (컨텍스트 포함 / 단독 접근 둘 다 지원) */}
        <Route
          path="/create/:promiseId/participants/new"
          element={<AddParticipantStartPage />}
        />
        <Route path="/participants/new" element={<AddParticipantStartPage />} />

        <Route path="/me" element={<MyPage />} />
        <Route path="/time/time1" element={<Time1 />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <BottomNav />
    </div>
  );
}
