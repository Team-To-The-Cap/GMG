// TopBar.tsx
import { useCallback } from "react";
import styles from "./style.module.css";
import { BackIcon } from "@/assets/icons/icons";

type Props = {
  title: string;
  showBack?: boolean; // ← 기본 false
  onBack?: () => void;
  right?: React.ReactNode;
};

export default function TopBar({
  title,
  showBack = false, // ← 기본값 변경
  onBack,
  right,
}: Props) {
  const handleBack = useCallback(() => {
    if (onBack) return onBack();
    if (window.history.length > 1) window.history.back();
  }, [onBack]);

  return (
    <header className={styles.topbar}>
      {showBack ? (
        <button
          className={styles.iconBtn}
          aria-label="뒤로가기"
          onClick={handleBack}
          type="button"
        >
          <BackIcon />
        </button>
      ) : (
        <div className={styles.spacer} aria-hidden />
      )}

      <h1 className={styles.title}>{title}</h1>

      {right ? (
        <div className={styles.right}>{right}</div>
      ) : (
        <div className={styles.spacer} aria-hidden />
      )}
    </header>
  );
}
