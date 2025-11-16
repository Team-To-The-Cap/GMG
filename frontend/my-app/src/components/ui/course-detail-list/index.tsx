import React from "react";
import styles from "./style.module.css";
import {
  RestaurantIcon,
  CafeIcon,
  ShopIcon,
  PinIcon,
  ClockIcon,
} from "@/assets/icons/icons";

export type TravelMode = "walk" | "subway" | "bus" | "car" | "taxi" | "bike";

export type CoursePlace = {
  name: string;
  category?: string;
  iconUrl?: string;
};

export type CourseVisit = {
  type: "visit";
  id: string;
  place: CoursePlace;
  stayMinutes: number;
  note?: string;
};

export type CourseTransfer = {
  type: "transfer";
  mode: TravelMode;
  minutes: number;
  distanceMeters?: number;
  note?: string;
};

export type CourseItem = CourseVisit | CourseTransfer;

type Props = {
  items: CourseItem[];
  className?: string;
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatMinutes(m: number) {
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h}시간 ${mm}분` : `${h}시간`;
}

function modeLabel(mode: TravelMode) {
  switch (mode) {
    case "walk":
      return "도보";
    case "subway":
      return "지하철";
    case "bus":
      return "버스";
    case "car":
      return "자동차";
    case "taxi":
      return "택시";
    case "bike":
      return "자전거";
    default:
      return "이동";
  }
}

function getCategoryIcon(category?: string, size: number = 20) {
  if (!category) return <PinIcon width={size} height={size} />;

  const key = category.trim().toLowerCase();

  if (
    key.includes("맛집") ||
    key.includes("식당") ||
    key.includes("레스토랑") ||
    key.includes("restaurant")
  )
    return <RestaurantIcon width={size} height={size} />;

  if (key.includes("카페") || key.includes("cafe") || key.includes("커피"))
    return <CafeIcon width={size} height={size} />;

  if (
    key.includes("샵") ||
    key.includes("shop") ||
    key.includes("상점") ||
    key.includes("쇼핑")
  )
    return <ShopIcon width={size} height={size} />;

  return <PinIcon width={size} height={size} />;
}

/** 파란 링 + 내부 아이콘/이미지 */
function PivotIcon({
  place,
  size = 32,
}: {
  place: CoursePlace;
  size?: number;
}) {
  const [broken, setBroken] = React.useState(false);
  const url = place.iconUrl?.trim();

  return (
    <span className={styles.pivot}>
      {url && !broken ? (
        <img
          src={url}
          alt=""
          className={styles.pivotImg}
          onError={() => setBroken(true)}
        />
      ) : (
        <span className={styles.pivotInner}>
          {getCategoryIcon(place.category, size)}
        </span>
      )}
    </span>
  );
}

export default function CourseDetailList({ items, className }: Props) {
  // 마지막 방문(visit)의 인덱스
  const lastVisitIdx = React.useMemo(() => {
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].type === "visit") return i;
    }
    return -1;
  }, [items]);

  return (
    <div className={cx(styles.wrapper, className)}>
      {/* 백그라운드 레일: 한 번만 그림 */}
      <span aria-hidden className={styles.backRail} />

      {items.map((it, idx) => {
        if (it.type === "visit") {
          const v = it as CourseVisit;
          const isLastVisit = idx === lastVisitIdx;

          return (
            <div key={`visit-${v.id}`} className={styles.row}>
              {/* 마지막 방문이면 data-last 부여 → 아래 꼬리 제거 */}
              <div
                className={styles.rail}
                data-last={isLastVisit ? "true" : undefined}
              >
                <PivotIcon place={v.place} size={32} />
              </div>

              <article className={styles.card}>
                <header className={styles.cardHeader}>
                  <h4 className={styles.place}>{v.place.name}</h4>
                  <div className={styles.timeBadge}>
                    <ClockIcon />
                    <span>{formatMinutes(v.stayMinutes)}</span>
                  </div>
                </header>
                {v.place.category && (
                  <div className={styles.category}>{v.place.category}</div>
                )}
                {v.note && <p className={styles.note}>{v.note}</p>}
              </article>
            </div>
          );
        }

        // 이동 구간: 텍스트만, 레일은 backRail이 담당
        const t = it as CourseTransfer;
        return (
          <div
            key={`transfer-${idx}`}
            className={cx(styles.row, styles.transferRow)}
          >
            <div className={styles.rail} />
            <div className={styles.transferText}>
              {modeLabel(t.mode)} {formatMinutes(t.minutes)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
