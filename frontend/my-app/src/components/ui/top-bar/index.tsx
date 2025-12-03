// src/components/ui/top-bar/index.tsx
import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./style.module.css";
import { BackIcon, ShareIcon } from "@/assets/icons/icons"; // ⬅️ 여기 수정

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
  /** 우측에 공유 버튼을 표시할지 여부 */
  showShare?: boolean;
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
  showShare = false,
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

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const shareTitle = title || "GMG 약속";

    // 모바일/지원 브라우저: Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          url,
        });
      } catch {
        // 사용자가 취소한 경우 등은 조용히 무시
      }
      return;
    }

    // 그 외: 클립보드 복사 시도
    try {
      await navigator.clipboard.writeText(url);
      alert("링크가 클립보드에 복사되었습니다.");
    } catch {
      alert(
        `이 브라우저에서는 공유를 지원하지 않습니다.\n아래 링크를 직접 복사해 주세요.\n\n${url}`
      );
    }
  }, [title]);

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
      ) : showShare ? (
        <button
          type="button"
          className={styles.iconBtn}
          aria-label="약속 공유"
          onClick={handleShare}
        >
          {/* ⬇️ 텍스트 대신 공유 아이콘 */}
          <ShareIcon />
        </button>
      ) : (
        <div className={styles.spacer} aria-hidden />
      )}
    </header>
  );
}
