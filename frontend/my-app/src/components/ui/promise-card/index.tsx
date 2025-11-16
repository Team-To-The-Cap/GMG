// src/components/ui/promise-card/index.tsx
import type { ReactNode } from "react";
import styles from "./style.module.css";
import Avatar from "../avatar";
import type { Participant as PromiseParticipant } from "@/types/promise";

type CardProps = {
  className?: string;
  children?: ReactNode;
  title?: string;
  dday?: number;
  footer?: ReactNode;
  participants?: PromiseParticipant[];
  variant?: "default" | "hero";
  onClick?: () => void;
  /** ✅ 일정 미정 여부: true면 D-Day 대신 "일정 미정" 표시 */
  unscheduled?: boolean;
};

function cx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatDday(n: number) {
  if (n === 0) return "D-Day";
  if (n > 0) return `D-${n}`;
  return `D+${Math.abs(n)}`;
}
function ddayTone(n: number): "danger" | "primary" | "muted" {
  if (n < 0) return "muted";
  if (n <= 1) return "danger";
  if (n <= 3) return "primary";
  return "muted";
}

export default function PromiseCard({
  className,
  children,
  title,
  dday,
  footer,
  participants = [],
  variant = "default",
  onClick,
  unscheduled,
}: CardProps) {
  const clickable = !!onClick;

  // ✅ 헤더를 보여줄지 여부: 제목 or D-Day or 일정 미정 배지
  const hasHeader = !!title || dday !== undefined || unscheduled;

  const visibleAvatars = participants.slice(0, 3);
  const hiddenCount = participants.length - visibleAvatars.length;

  // ✅ 배지 텍스트 / 톤 결정
  let badgeText: string | undefined;
  let badgeTone: "danger" | "primary" | "muted" | undefined;

  if (unscheduled) {
    badgeText = "일정 미정";
    badgeTone = "muted";
  } else if (dday !== undefined) {
    badgeText = formatDday(dday);
    badgeTone = ddayTone(dday);
  }

  return (
    <section
      className={cx(
        styles.card,
        styles[variant],
        clickable && styles.clickable,
        className
      )}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {hasHeader && (
        <header className={cx(styles.header, styles[`header--${variant}`])}>
          {title && (
            <h3 className={cx(styles.title, styles[`title--${variant}`])}>
              {title}
            </h3>
          )}

          {badgeText && (
            <span
              className={cx(
                styles.badge,
                styles[`badge--${variant}`],
                badgeTone ? styles[badgeTone] : undefined // ✅ 여기 수정
              )}
            >
              {badgeText}
            </span>
          )}
        </header>
      )}

      <div className={styles.body}>{children}</div>

      {footer && <footer className={styles.footer}>{footer}</footer>}

      <div
        className={cx(
          styles.participantList,
          styles[`participantList--${variant}`]
        )}
      >
        {visibleAvatars.map((p) => (
          <div key={p.id} className={styles.participantAvatar}>
            <Avatar alt={p.name} src={p.avatarUrl} size={28} />
          </div>
        ))}
        {hiddenCount > 0 && (
          <div className={styles.moreBadge}>+{hiddenCount}</div>
        )}
      </div>
    </section>
  );
}
