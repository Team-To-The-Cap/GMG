// src/components/ui/course-summary-card/index.tsx
import React from "react";
import styles from "./style.module.css";

type Props = {
  /** 카드 상단 제목 (기본: "코스 요약") */
  title?: string;
  /** 총 소요 시간(분) – 필수 */
  totalMinutes: number;
  /** 활동 시간(분) – 선택 */
  activityMinutes?: number;
  /** 이동 시간(분) – 선택 */
  travelMinutes?: number;
  /** 우측 상단 액션 버튼 등 (선택) */
  action?: React.ReactNode;
  /** 외부에서 여분의 클래스 추가 */
  className?: string;
  /** compact: 살짝 더 낮은 높이/여백 */
  variant?: "default" | "compact";
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatKoDuration(mins: number | undefined) {
  if (mins === undefined) return "-";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

export default function CourseSummaryCard({
  title = "코스 요약",
  totalMinutes,
  activityMinutes,
  travelMinutes,
  action,
  className,
  variant = "default",
}: Props) {
  return (
    <section className={cx(styles.card, styles[variant], className)}>
      <header className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {action && <div className={styles.action}>{action}</div>}
      </header>

      <div className={styles.rowPrimary}>
        <span className={styles.label}>총 소요시간</span>
        <strong className={styles.totalValue}>
          {formatKoDuration(totalMinutes)}
        </strong>
      </div>

      <div className={styles.rowSecondary}>
        <span className={styles.subItem}>
          활동시간:{" "}
          <b className={styles.subValue}>{formatKoDuration(activityMinutes)}</b>
        </span>
        <span className={styles.subItemRight}>
          이동시간:{" "}
          <b className={styles.subValue}>{formatKoDuration(travelMinutes)}</b>
        </span>
      </div>
    </section>
  );
}
