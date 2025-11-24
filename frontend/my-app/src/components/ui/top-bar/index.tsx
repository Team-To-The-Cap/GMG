import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./style.module.css";
import { BackIcon } from "@/assets/icons/icons";

type Size = "sm" | "md" | "lg";
type Tone = "default" | "white";

type Props = {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  /** 사이즈 variant (default: md) */
  size?: Size;
  /** 색상 variant (default: white) */
  tone?: Tone;
  /** 논리적인 "뒤로 갈 경로" (App의 getTopBarConfig에서 내려줌) */
  backTo?: string;
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
  backTo,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = useCallback(() => {
    // 1) 상위에서 onBack을 명시적으로 넘겨준 경우 그걸 우선
    if (onBack) return onBack();

    // 2) backTo가 있으면, 현재 location.state를 그대로 들고 이동
    if (backTo) {
      return navigate(backTo, { state: location.state });
    }

    // 3) 히스토리가 있다면 한 칸 뒤로
    if (window.history.length > 1) {
      return navigate(-1);
    }

    // 4) 그마저도 없으면 홈으로
    navigate("/", { replace: true });
  }, [onBack, backTo, navigate, location.state]);

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
