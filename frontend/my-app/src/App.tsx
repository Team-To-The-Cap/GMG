// src/App.tsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useMemo } from "react";

import Home from "@/pages/home";
import CreatePromiseMain from "@/pages/create-promise-main";
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
          <Route path="/" element={<Home />} />

          {RUNTIME.TEST_MODE && (
            <Route
              path="/create"
              element={
                <Navigate to={`/create/${DEFAULT_PROMISE_ID}`} replace />
              }
            />
          )}

          <Route path="/create/:promiseId" element={<CreatePromiseMain />} />

          <Route
            path="/create/:promiseId/participants/new"
            element={<AddParticipantStartPage />}
          />
          <Route
            path="/participants/new"
            element={<AddParticipantStartPage />}
          />

          <Route
            path="/create/:promiseId/participants/new/origin"
            element={<AddParticipantOriginPage />}
          />
          <Route
            path="/participants/new/origin"
            element={<AddParticipantOriginPage />}
          />

          <Route
            path="/create/:promiseId/participants/new/origin/search"
            element={<SearchOriginPage />}
          />
          <Route
            path="/participants/new/origin/search"
            element={<SearchOriginPage />}
          />

          <Route path="/me" element={<MyPage />} />
          <Route path="/time/time1" element={<Time1 />} />
          <Route path="/time/timeresult" element={<TimeResult />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <BottomNav />
    </div>
  );
}
