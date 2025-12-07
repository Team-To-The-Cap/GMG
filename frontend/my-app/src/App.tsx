// src/App.tsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useMemo, useCallback, useRef } from "react";

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
import CourseReviewScreen from "./pages/course-review";

export default function App() {
  const location = useLocation();

  const shareInProgressRef = useRef(false); // 🔹 공유 중복 호출 방지용

  const { title, showBack, backTo, showShare } = useMemo(
    () => getTopBarConfig(location.pathname),
    [location.pathname]
  );

  // 🔗 실제 웹에서 열릴 수 있는 베이스 URL
  // 배포 주소가 생기면 VITE_PUBLIC_WEB_BASE_URL에 넣어두고 사용하면 됨
  const PUBLIC_BASE_URL =
    import.meta.env.VITE_PUBLIC_WEB_BASE_URL ?? "https://example.com";

  const isIgnorableShareError = (err: unknown) => {
    if (!err || typeof err !== "object") return false;
    const anyErr = err as any;
    const name = anyErr.name as string | undefined;
    const message = anyErr.message as string | undefined;

    // ✅ 사용자가 취소했거나, 이미 share()가 진행 중일 때 나는 에러들
    if (name === "AbortError") return true;
    if (name === "InvalidStateError") return true;
    if (typeof message === "string") {
      if (message.toLowerCase().includes("abort due to cancellation"))
        return true;
      if (message.toLowerCase().includes("share() is already in progress"))
        return true;
    }
    return false;
  };

  const handleShare = useCallback(async () => {
    // 🔒 이미 공유 중이면 그냥 무시
    if (shareInProgressRef.current) return;
    shareInProgressRef.current = true;

    try {
      const shareUrl = `${PUBLIC_BASE_URL}${location.pathname}`;

      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title: "약속 공유",
          text: "GMG에서 약속을 확인해보세요!",
          url: shareUrl,
          dialogTitle: "약속 공유하기",
        });
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: "약속 공유",
          text: "GMG에서 약속을 확인해보세요!",
          url: shareUrl,
        });
        return;
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        alert("공유 링크가 클립보드에 복사되었습니다.");
        return;
      }

      alert(
        `이 환경에서는 공유 기능을 사용할 수 없습니다.\n\n링크: ${shareUrl}`
      );
    } catch (e) {
      // 👇 로그는 남기되, 취소/중복 호출 에러는 조용히 무시
      console.warn("[share] error", e);

      if (isIgnorableShareError(e)) {
        // 사용자 취소나 중복 호출은 정상적인 사용자 행동으로 취급
        return;
      }

      // 진짜 오류만 사용자에게 알리기
      alert("공유 중 오류가 발생했습니다.");
    } finally {
      shareInProgressRef.current = false;
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

          {/*코스디테일*/}
          <Route path="/details/:promiseId/course-review" element={<CourseReviewScreen />} />
          <Route path="/create/:promiseId/course-review" element={<CourseReviewScreen />} />

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
