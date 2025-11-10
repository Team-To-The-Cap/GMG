// src/components/layout/bottom-nav/index.tsx
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useState } from "react";
import styles from "./style.module.css";
import { HomeIcon, PlusIcon, UserIcon } from "@/assets/icons/icons";
import { createEmptyPromise } from "@/services/promise.service";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [creating, setCreating] = useState(false);

  const handleCreateClick = useCallback(async () => {
    if (creating) return; // 중복 클릭 방지
    try {
      setCreating(true);
      const created = await createEmptyPromise();
      navigate(`/create/${created.id}`);
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

      {/* ✅ NavLink 대신 버튼: 새 약속 생성 후 이동 */}
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
