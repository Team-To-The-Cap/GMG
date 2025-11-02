import React from "react";
import styles from "./style.module.css";
import {
  RestaurantIcon,
  CafeIcon,
  ShopIcon,
  PinIcon,
  ClockIcon,
  ArrowDownIcon,
} from "@/assets/icons/icons";

export type TravelMode = "walk" | "subway" | "bus" | "car" | "taxi" | "bike";

export type CoursePlace = {
  name: string;
  category?: string;
  iconUrl?: string; // 원형 썸네일(이모지/이미지 가능)
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

function PivotIcon({
  place,
  size = 20,
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
        <span className={styles.pivotIcon}>
          {getCategoryIcon(place.category, size)}
        </span>
      )}
    </span>
  );
}

export default function CourseDetailList({ items, className }: Props) {
  const lastVisitIndex = [...items]
    .reverse()
    .findIndex((i) => i.type === "visit");
  const lastVisitAbsIndex =
    lastVisitIndex === -1 ? -1 : items.length - 1 - lastVisitIndex;

  return (
    <div className={cx(styles.wrapper, className)}>
      {items.map((it, idx) => {
        if (it.type === "visit") {
          const v = it as CourseVisit;
          const isLastVisit = idx === lastVisitAbsIndex;

          return (
            <div key={`visit-${v.id}`} className={styles.row}>
              {/* 좌측 레일 */}
              <div className={styles.rail}>
                <span
                  className={cx(
                    styles.railLine,
                    styles.railLineTop,
                    idx === 0 && styles.hidden
                  )}
                />
                {/* ✅ 아이콘 */}
                <PivotIcon place={v.place} size={100} />
                <span
                  className={cx(
                    styles.railLine,
                    styles.railLineBottom,
                    isLastVisit && styles.hidden
                  )}
                />
              </div>

              {/* 우측 카드 */}
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

        // 이동 구간
        const t = it as CourseTransfer;
        return (
          <div
            key={`transfer-${idx}`}
            className={cx(styles.row, styles.transferRow)}
          >
            <div className={styles.rail}>
              <span className={styles.transferIcon}>
                <ArrowDownIcon />
              </span>
            </div>
            <div className={styles.transferText}>
              {modeLabel(t.mode)} {formatMinutes(t.minutes)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
