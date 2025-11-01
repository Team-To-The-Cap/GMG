import { NavLink } from "react-router-dom";
import styles from "./style.module.css";
import { HomeIcon, PlusIcon, UserIcon } from "@/assets/icons/icons";
import { DEFAULT_PROMISE_ID } from "@/config/runtime";

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
        to={`/create/${DEFAULT_PROMISE_ID}`}
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
