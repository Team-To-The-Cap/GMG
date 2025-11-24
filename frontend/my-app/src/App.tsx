// src/App.tsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useMemo, useCallback } from "react";

import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

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
import { ShareIcon } from "@/assets/icons/icons";

import "./App.css";

export default function App() {
  const location = useLocation();

  const { title, showBack, backTo, showShare } = useMemo(
    () => getTopBarConfig(location.pathname),
    [location.pathname]
  );

  // 🔗 실제 웹에서 열릴 수 있는 베이스 URL
  // 배포 주소가 생기면 VITE_PUBLIC_WEB_BASE_URL에 넣어두고 사용하면 됨
  const PUBLIC_BASE_URL =
    import.meta.env.VITE_PUBLIC_WEB_BASE_URL ?? "https://example.com";

  const handleShare = useCallback(async () => {
    try {
      const shareUrl = `${PUBLIC_BASE_URL}${location.pathname}`;

      // 1) 네이티브(Capacitor) 환경이면 Capacitor Share 플러그인 사용
      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title: "약속 공유",
          text: "GMG에서 약속을 확인해보세요!",
          url: shareUrl,
          dialogTitle: "약속 공유하기",
        });
        return;
      }

      // 2) 브라우저에서 Web Share API 지원 시
      if (navigator.share) {
        await navigator.share({
          title: "약속 공유",
          text: "GMG에서 약속을 확인해보세요!",
          url: shareUrl,
        });
        return;
      }

      // 3) 마지막 fallback: 클립보드 복사
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        alert("공유 링크가 클립보드에 복사되었습니다.");
        return;
      }

      alert(
        `이 환경에서는 공유 기능을 사용할 수 없습니다.\n\n링크: ${shareUrl}`
      );
    } catch (e) {
      console.error("[share] error", e);
      alert("공유 중 오류가 발생했습니다.");
    }
  }, [location.pathname, PUBLIC_BASE_URL]);

  return (
    <div className="appRoot">
      <TopBar
        title={title}
        showBack={showBack}
        backTo={backTo}
        // 👉 우측 공유 아이콘
        right={
          showShare ? (
            <button
              type="button"
              aria-label="약속 공유"
              onClick={handleShare}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                background: "transparent",
                display: "grid",
                placeItems: "center",
                padding: 0,
              }}
            >
              <ShareIcon />
            </button>
          ) : undefined
        }
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

          {/* 반드시 가고 싶은 장소 검색 */}
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
