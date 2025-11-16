// src/components/layout/bottom-nav/index.tsx
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useState } from "react";
import styles from "./style.module.css";
import { HomeIcon, PlusIcon, UserIcon } from "@/assets/icons/icons";
import { createEmptyPromise } from "@/services/promise/promise.service";

const DRAFT_PROMISE_ID_KEY = "GMG_LAST_DRAFT_PROMISE_ID";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [creating, setCreating] = useState(false);

  const handleCreateClick = useCallback(async () => {
    if (creating) return;

    try {
      setCreating(true);

      const savedDraftId = localStorage.getItem(DRAFT_PROMISE_ID_KEY);
      if (savedDraftId) {
        navigate(`/create/${savedDraftId}`);
        return;
      }

      const draft = await createEmptyPromise();
      localStorage.setItem(DRAFT_PROMISE_ID_KEY, draft.id);
      navigate(`/create/${draft.id}`);
    } finally {
      setCreating(false);
    }
  }, [creating, navigate]);

  const isCreateActive = location.pathname.startsWith("/create");

  // 🔹 Home 활성 조건: "/" 또는 "/details/..." 일 때
  const isHomeLikePath =
    location.pathname === "/" || location.pathname.startsWith("/details/");

  return (
    <nav className={styles.nav} aria-label="Bottom Navigation">
      <NavLink
        to="/"
        className={({ isActive }) =>
          isActive || isHomeLikePath ? styles.itemActive : styles.item
        }
      >
        <HomeIcon />
        <span>홈</span>
      </NavLink>

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
