// src/components/layout/bottom-nav/index.tsx
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useState } from "react";
import styles from "./style.module.css";
import { HomeIcon, PlusIcon, UserIcon } from "@/assets/icons/icons";
import { createEmptyPromise } from "@/services/promise.service";

const DRAFT_PROMISE_ID_KEY = "GMG_LAST_DRAFT_PROMISE_ID";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [creating, setCreating] = useState(false);

  const handleCreateClick = useCallback(async () => {
    if (creating) return;

    // 1) 기존 작성 중 초안 ID가 있으면 그걸로 이동
    const savedDraftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);
    if (savedDraftId) {
      navigate(`/create/${savedDraftId}`);
      return;
    }

    // 2) 없으면 서버/모크에서 "빈 ID" 하나 발급
    try {
      setCreating(true);
      const draft = await createEmptyPromise(); // PromiseDetail 반환 가정
      localStorage.setItem(DRAFT_PROMISE_ID_KEY, draft.id);
      navigate(`/create/${draft.id}`);
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

      {/* ✅ NavLink 대신 버튼으로 변경 */}
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
