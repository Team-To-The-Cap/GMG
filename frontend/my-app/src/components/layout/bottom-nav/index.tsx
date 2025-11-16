// src/components/layout/bottom-nav/index.tsx
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useState } from "react";
import styles from "./style.module.css";
import { HomeIcon, PlusIcon, UserIcon } from "@/assets/icons/icons";

// 🚀 FastAPI용 서비스
import { createMeeting } from "@/services/meeting.service";

const DRAFT_PROMISE_ID_KEY = "GMG_LAST_DRAFT_PROMISE_ID";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [creating, setCreating] = useState(false);

  const handleCreateClick = useCallback(async () => {
    if (creating) return; // 중복 방지

    // 1) 기존 작성 중인 초안이 있으면 그걸로 이동
    const savedDraftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);
    if (savedDraftId) {
      navigate(`/create/${savedDraftId}`);
      return;
    }

    // 2) 없다면 FastAPI에 새 미팅 생성 요청
    try {
      setCreating(true);

      // FastAPI: POST /api/meetings/
      const meeting = await createMeeting("새 약속");
      const meetingId = String(meeting.id);

      // draft ID 저장
      localStorage.setItem(DRAFT_PROMISE_ID_KEY, meetingId);

      // 생성된 약속 편집 화면으로 이동
      navigate(`/create/${meetingId}`);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "약속 생성 중 오류가 발생했습니다.");
    } finally {
      setCreating(false);
    }
  }, [creating, navigate]);

  const isCreateActive = location.pathname.startsWith("/create");

  return (
    <nav className={styles.nav} aria-label="Bottom Navigation">
      <NavLink
        to="/"
        className={({ isActive }) =>
          isActive ? styles.itemActive : styles.item
        }
      >
        <HomeIcon />
        <span>홈</span>
      </NavLink>

      {/* 생성 버튼 */}
      <button
        type="button"
        className={isCreateActive ? styles.itemActive : styles.item}
        onClick={handleCreateClick}
        disabled={creating}
      >
        <PlusIcon />
        <span>{creating ? "생성 중..." : "약속추가"}</span>
      </button>

      <NavLink
        to="/me"
        className={({ isActive }) =>
          isActive ? styles.itemActive : styles.item
        }
      >
        <UserIcon />
        <span>마이페이지</span>
      </NavLink>
    </nav>
  );
}
