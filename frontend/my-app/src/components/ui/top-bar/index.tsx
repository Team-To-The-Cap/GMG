import { useCallback } from "react";
import styles from "./style.module.css";
import { BackIcon } from "@/assets/icons/icons";

type Size = "sm" | "md" | "lg";
type Tone = "default" | "white";

type Props = {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  /** 사이즈 variant (default: sm) */
  size?: Size;
  /** 색상 variant (default: default) */
  tone?: Tone;
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function TopBar({
  title,
  showBack = false,
  onBack,
  right,
  size = "md",
  tone = "white",
}: Props) {
  const handleBack = useCallback(() => {
    if (onBack) return onBack();
    if (window.history.length > 1) window.history.back();
  }, [onBack]);

  return (
    <header
      className={cx(
        styles.topbar,
        styles[`size-${size}`],
        styles[`tone-${tone}`]
      )}
    >
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
