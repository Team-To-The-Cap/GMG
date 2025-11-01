// src/components/ui/card/index.tsx
import type { ReactNode } from "react";
import styles from "./style.module.css";

type CardProps = {
  className?: string;
  children?: ReactNode;
  title?: string;
  dday?: number;
  footer?: ReactNode;
  /** 디자인 용도 확장 */
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
  variant = "default",
}: CardProps) {
  const hasHeader = title || dday !== undefined;

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
    </section>
  );
}
