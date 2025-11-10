// src/App.tsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useMemo } from "react";

import Home from "@/pages/home";
import CreatePromiseMain from "@/pages/create-promise-main";
import PromiseDetailPage from "@/pages/promise-detail";
import MyPage from "@/pages/my-page";
import { Time as Time1 } from "@/pages/promise-time/Time";
import { TimeResult } from "@/pages/promise-time/TimeResult";
import AddParticipantStartPage from "@/pages/participants/add-start";
import AddParticipantOriginPage from "@/pages/participants/add-origin";
import SearchOriginPage from "@/pages/participants/search-origin";

import BottomNav from "@/components/layout/bottom-nav";
import TopBar from "@/components/ui/top-bar";
import { RUNTIME, DEFAULT_PROMISE_ID } from "@/config/runtime";
import { getTopBarConfig } from "@/utils/getTopBarConfig";

import "./App.css"; // 🔹 App 전용 스타일

export default function App() {
  const location = useLocation();
  const { title, showBack } = useMemo(
    () => getTopBarConfig(location.pathname),
    [location.pathname]
  );

  return (
    <div className="appRoot">
      <TopBar title={title} showBack={showBack} />

      {/* 🔹 여기서 Routes를 컨테이너로 감쌈 */}
      <main className="pageContainer">
        <Routes>
          {/* 홈 */}
          <Route path="/" element={<Home />} />

          {/* TEST_MODE에서만 /create → /create/:id 로 보정 */}
          {RUNTIME.TEST_MODE && (
            <Route
              path="/create"
              element={
                <Navigate to={`/create/${DEFAULT_PROMISE_ID}`} replace />
              }
            />
          )}

          {/* 약속 생성/편집 메인 */}
          <Route path="/create/:promiseId" element={<CreatePromiseMain />} />

          {/* ✅ 약속 상세 페이지 (/details/:promiseId) */}
          <Route path="/details/:promiseId" element={<PromiseDetailPage />} />

          {/* 참가자 추가 시작 */}
          <Route
            path="/create/:promiseId/participants/new"
            element={<AddParticipantStartPage />}
          />
          <Route
            path="/participants/new"
            element={<AddParticipantStartPage />}
          />

          {/* 출발 장소 선택 */}
          <Route
            path="/create/:promiseId/participants/new/origin"
            element={<AddParticipantOriginPage />}
          />
          <Route
            path="/participants/new/origin"
            element={<AddParticipantOriginPage />}
          />

          {/* 출발 장소 검색 */}
          <Route
            path="/create/:promiseId/participants/new/origin/search"
            element={<SearchOriginPage />}
          />
          <Route
            path="/participants/new/origin/search"
            element={<SearchOriginPage />}
          />

          {/* 마이페이지 & 시간 관련 */}
          <Route path="/me" element={<MyPage />} />
          <Route path="/time/time1" element={<Time1 />} />
          <Route path="/time/timeresult" element={<TimeResult />} />

          {/* 404 → 홈으로 리다이렉트 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <BottomNav />
    </div>
  );
}
