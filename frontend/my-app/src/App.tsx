import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useMemo } from "react";

import Home from "@/pages/home";
import CreatePromiseMain from "@/pages/create-promise-main";
import PromiseDetailPage from "@/pages/promise-detail";
import MyPage from "@/pages/my-page";

import AddParticipantStartPage from "@/pages/participants/add-start";
import AddParticipantOriginPage from "@/pages/participants/add-origin";
import SearchOriginPage from "@/pages/participants/search-origin";
import AddParticipantPreferencesPage from "@/pages/participants/add-preferences";
import { PlaceCalculationScreen } from "@/pages/participants/place-calculation";

import { Time as Time1 } from "@/pages/promise-time/Time";
import { TimeResult } from "@/pages/promise-time/TimeResult";

import BottomNav from "@/components/layout/bottom-nav";
import TopBar from "@/components/ui/top-bar";
import { RUNTIME, DEFAULT_PROMISE_ID } from "@/config/runtime";
import { getTopBarConfig } from "@/utils/getTopBarConfig";

import "./App.css";

export default function App() {
  const location = useLocation();

  const { title, showBack, backTo } = useMemo(
    () => getTopBarConfig(location.pathname),
    [location.pathname]
  );

  return (
    <div className="appRoot">
      <TopBar
        title={title}
        showBack={showBack}
        backTo={backTo} // ✅ onBack 대신 backTo만 넘김
      />

      <main className="pageContainer">
        <Routes>
          {/* 홈 */}
          <Route path="/" element={<Home />} />

          {/* TEST_MODE에서만 /create → /details/:id 로 보정 */}
          {RUNTIME.TEST_MODE && (
            <Route
              path="/create"
              element={
                <Navigate to={`/details/${DEFAULT_PROMISE_ID}`} replace />
              }
            />
          )}

          {/* 약속 생성/편집 메인 */}
          <Route path="/create/:promiseId" element={<CreatePromiseMain />} />

          {/* 약속 상세 */}
          <Route path="/details/:promiseId" element={<PromiseDetailPage />} />

          {/* 참가자 추가 시작 */}
          <Route
            path="/details/:promiseId/participants/new"
            element={<AddParticipantStartPage />}
          />
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
            path="/details/:promiseId/participants/new/origin"
            element={<AddParticipantOriginPage />}
          />
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
            path="/details/:promiseId/participants/new/origin/search"
            element={<SearchOriginPage />}
          />
          <Route
            path="/create/:promiseId/participants/new/origin/search"
            element={<SearchOriginPage />}
          />
          <Route
            path="/participants/new/origin/search"
            element={<SearchOriginPage />}
          />

          {/* 선호 선택 페이지 */}
          <Route
            path="/details/:promiseId/participants/new/preferences"
            element={<AddParticipantPreferencesPage />}
          />
          <Route
            path="/create/:promiseId/participants/new/preferences"
            element={<AddParticipantPreferencesPage />}
          />

          {/* 장소 계산 화면 */}
          <Route
            path="/details/:promiseId/place-calculation"
            element={<PlaceCalculationScreen />}
          />
          <Route
            path="/create/:promiseId/place-calculation"
            element={<PlaceCalculationScreen />}
          />

          {/* 마이페이지 */}
          <Route path="/me" element={<MyPage />} />

          {/* 시간 선택/결과 */}
          <Route path="/create/:promiseId/promise-time" element={<Time1 />} />
          <Route path="/details/:promiseId/promise-time" element={<Time1 />} />
          <Route path="/time/timeresult/:promiseId" element={<TimeResult />} />

          {/* ✅ 반드시 가고 싶은 장소 검색 (새로 추가) */}
          <Route
            path="/details/:promiseId/must-visit/search"
            element={<SearchOriginPage />}
          />
          <Route
            path="/create/:promiseId/must-visit/search"
            element={<SearchOriginPage />}
          />

          {/* 404 → 홈으로 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <BottomNav />
    </div>
  );
}
