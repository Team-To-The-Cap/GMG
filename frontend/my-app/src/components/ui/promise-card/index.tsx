// src/components/ui/promise-card/index.tsx
import type { ReactNode } from "react";
import styles from "./style.module.css";
import Avatar from "../avatar"; // 경로는 실제 구조에 맞게
import type { Participant as PromiseParticipant } from "@/types/promise"; // ✅ 기존 타입 사용

type CardProps = {
  className?: string;
  children?: ReactNode;
  title?: string;
  dday?: number;
  footer?: ReactNode;
  participants?: PromiseParticipant[]; // ✅ avatarUrl이 있는 타입
  variant?: "default" | "hero";
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
  participants = [], // ✅ 기본값
  variant = "default",
}: CardProps) {
  const hasHeader = title || dday !== undefined;
  const visibleAvatars = participants.slice(0, 3);
  const hiddenCount = participants.length - visibleAvatars.length;

  return (
    <section className={cx(styles.card, styles[variant], className)}>
      {hasHeader && (
        <header className={cx(styles.header, styles[`header--${variant}`])}>
          {title && (
            <h3 className={cx(styles.title, styles[`title--${variant}`])}>
              {title}
            </h3>
          )}
          {dday !== undefined && (
            <span
              className={cx(
                styles.badge,
                styles[`badge--${variant}`],
                styles[ddayTone(dday)]
              )}
            >
              {formatDday(dday)}
            </span>
          )}
        </header>
      )}

      <div className={styles.body}>{children}</div>
      {footer && <footer className={styles.footer}>{footer}</footer>}

      {/* 참가자 아바타 */}
      <div
        className={cx(
          styles.participantList,
          styles[`participantList--${variant}`]
        )}
      >
        {visibleAvatars.map((p) => (
          <div key={p.id} className={styles.participantAvatar}>
            {/* ✅ avatarUrl을 그대로 전달 */}
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
