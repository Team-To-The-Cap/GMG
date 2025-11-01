import { NavLink } from "react-router-dom";
import styles from "./style.module.css";

export default function BottomNav() {
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

      <NavLink
        to="/create"
        className={({ isActive }) =>
          isActive ? styles.itemActive : styles.item
        }
      >
        <PlusIcon />
        <span>약속추가</span>
      </NavLink>

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

/* ── 간단한 SVG 아이콘 (크기/색은 CSS로 제어) ── */
function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden width="24" height="24">
      <path
        d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5z"
        fill="currentColor"
      />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden width="24" height="24">
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z" fill="currentColor" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden width="24" height="24">
      <path
        d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.42 0-8 2.13-8 4.75V21h16v-2.25C20 16.13 16.42 14 12 14z"
        fill="currentColor"
      />
    </svg>
  );
}
