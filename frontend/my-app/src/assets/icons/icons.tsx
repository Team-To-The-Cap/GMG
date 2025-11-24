// src/assets/icons/icons.tsx
import * as React from "react";
import { Share } from "lucide-react";

type SvgProps = React.SVGProps<SVGSVGElement> & { title?: string };

/** a11y: title 없으면 aria-hidden 처리 */
function withA11y<P extends SvgProps>(Comp: React.FC<P>): React.FC<P> {
  return React.memo((props: P) => {
    const { title, ...rest } = props;
    return (
      <Comp
        aria-hidden={title ? undefined : true}
        role={title ? "img" : undefined}
        focusable="false"
        {...(rest as P)}
        title={title}
      />
    );
  });
}

// ───────────── 16px ─────────────
export const ArrowRightIcon = withA11y<SvgProps>((props) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...props}>
    <path
      d="M9 18l6-6-6-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    />
  </svg>
));

// ───────────── 20px 기본 ─────────────
export const UserIcon = withA11y<SvgProps>((props) => (
  <svg viewBox="0 0 24 24" width={20} height={20} {...props}>
    <path
      d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.1-8 4.7V21h16v-2.3C20 16.1 16.4 14 12 14Z"
      fill="currentColor"
    />
  </svg>
));

export const CalendarIcon = withA11y<SvgProps>((props) => (
  <svg viewBox="0 0 24 24" width={20} height={20} {...props}>
    <path
      d="M7 2v3M17 2v3M3 9h18M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    />
  </svg>
));

export const MapIcon = withA11y<SvgProps>((props) => (
  <svg viewBox="0 0 24 24" width={20} height={20} {...props}>
    <path
      d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <path d="M9 3v15" fill="none" stroke="currentColor" strokeWidth={2} />
    <path d="M15 6v15" fill="none" stroke="currentColor" strokeWidth={2} />
  </svg>
));

// ───────────── BottomNav 등 24px ─────────────
export const HomeIcon = withA11y<SvgProps>((props) => (
  <svg viewBox="0 0 24 24" width={24} height={24} {...props}>
    <path
      d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5z"
      fill="currentColor"
    />
  </svg>
));

export const PlusIcon = withA11y<SvgProps>((props) => (
  <svg viewBox="0 0 24 24" width={24} height={24} {...props}>
    <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z" fill="currentColor" />
  </svg>
));

export const BackIcon = withA11y<SvgProps>((props) => (
  <svg viewBox="0 0 24 24" width={24} height={24} {...props}>
    <path
      d="M15 6l-6 6 6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    />
  </svg>
));

// ───────────── 장소 핀 아이콘 (20px) ─────────────
export const PinIcon = withA11y<SvgProps>((props) => (
  <svg viewBox="0 0 24 24" width={20} height={20} {...props}>
    <path
      d="M12 22s8-7.16 8-13A8 8 0 0 0 4 9c0 5.84 8 13 8 13Z"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <circle cx="12" cy="9" r="3" fill="currentColor" />
  </svg>
));

// ───────────── 결과(Result) 아이콘 (20px) ─────────────
export const ResultIcon = withA11y<SvgProps>((props) => (
  <svg viewBox="0 0 24 24" width={20} height={20} {...props}>
    <path
      d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    />
    <path
      d="M8 12l2.5 2.5L16 9"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));

// ───────────── 식당(레스토랑) 아이콘 (20px) ─────────────
export const RestaurantIcon = withA11y<SvgProps>((props) => (
  <svg viewBox="0 0 24 24" width={20} height={20} {...props}>
    <circle
      cx="12"
      cy="12"
      r="5.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    />
    <circle
      cx="12"
      cy="12"
      r="2.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    />
    <path
      d="M5.5 5v6"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    />
    <path
      d="M4.2 5v3M6.8 5v3"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    />
    <path
      d="M18 5v10"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    />
  </svg>
));

// ───────────── 카페(커피) 아이콘 (20px) ─────────────
export const CafeIcon = withA11y<SvgProps>((props) => (
  <svg viewBox="0 0 24 24" width={20} height={20} {...props}>
    <path
      d="M5 9h9v5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V9Z"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <path
      d="M14 10h2.2a2.3 2.3 0 0 1 0 4.6H14"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 18h10"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    />
    <path
      d="M8.5 6c0-1 .8-1.2.8-2.2"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    />
    <path
      d="M11 6c0-1 .8-1.2.8-2.2"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    />
  </svg>
));

// ───────────── 샵(쇼핑) 아이콘 (20px) ─────────────
export const ShopIcon = withA11y<SvgProps>((props) => (
  <svg viewBox="0 0 24 24" width={20} height={20} {...props}>
    <rect
      x="6"
      y="8"
      width="12"
      height="11"
      rx="2"
      ry="2"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    />
    <path
      d="M8.5 8V7a3.5 3.5 0 0 1 7 0v1"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    />
    <circle cx="9" cy="10" r="1" fill="currentColor" />
    <circle cx="15" cy="10" r="1" fill="currentColor" />
  </svg>
));

// ───────────── 시계(체류시간) 아이콘 (18px) ─────────────
export const ClockIcon = withA11y<SvgProps>((props) => (
  <svg viewBox="0 0 24 24" width={18} height={18} {...props}>
    <circle
      cx="12"
      cy="12"
      r="9"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    />
    <path
      d="M12 7v5l3 2"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    />
  </svg>
));

// ───────────── 아래 화살표(이동 표시) 아이콘 (18px) ─────────────
export const ArrowDownIcon = withA11y<SvgProps>((props) => (
  <svg viewBox="0 0 24 24" width={18} height={18} {...props}>
    <path
      d="M12 5v14"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    />
    <path
      d="M6 13l6 6 6-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    />
  </svg>
));

// ───────────── 이름(Name) 아이콘 (20px) ─────────────
export const NameIcon = withA11y<SvgProps>((props) => (
  <svg viewBox="0 0 24 24" width={20} height={20} {...props}>
    <rect
      x="3"
      y="6"
      width="18"
      height="12"
      rx="2"
      ry="2"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    />
    <circle
      cx="8.5"
      cy="12"
      r="2"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    />
    <path
      d="M13 10h5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    />
    <path
      d="M13 14h4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    />
  </svg>
));

// ───────────── 수정(Edit) 아이콘 (20px) ─────────────
export const EditIcon = withA11y<SvgProps>((props) => (
  <svg viewBox="0 0 24 24" width={20} height={20} {...props}>
    <path
      d="M4 20l4-1 9.5-9.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 15v5Z"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <path
      d="M14 6l4 4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    />
  </svg>
));

// ───────────── 추가 아이콘 (다른 브랜치에서 온 것) ─────────────
// PinIcon 변형
export const PinIcon2 = withA11y<SvgProps>((props) => (
  <svg viewBox="0 0 24 24" width={20} height={20} {...props}>
    <path
      d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    />
    <circle
      cx="12"
      cy="10"
      r="2.8"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    />
  </svg>
));

// 휴지통(삭제)
export const TrashIcon = withA11y<SvgProps>((props) => (
  <svg viewBox="0 0 24 24" width={20} height={20} {...props}>
    <path d="M3 6h18" stroke="currentColor" strokeWidth={2} fill="none" />
    <path
      d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
      stroke="currentColor"
      strokeWidth={2}
      fill="none"
    />
    <path d="M10 11v7M14 11v7" stroke="currentColor" strokeWidth={2} />
    <path
      d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
      stroke="currentColor"
      strokeWidth={2}
      fill="none"
    />
  </svg>
));

// 하트
export const HeartIcon = withA11y<SvgProps>((props) => (
  <svg viewBox="0 0 24 24" width={20} height={20} {...props}>
    <path
      d="M20.5 8.6c0 4.6-6.7 9.3-8.5 10.6-1.8-1.3-8.5-6-8.5-10.6A4.9 4.9 0 0 1 8 3.9c1.6 0 3.1.9 4 2.3.9-1.4 2.4-2.3 4-2.3a4.9 4.9 0 0 1 4.5 4.7Z"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
    />
  </svg>
));

export const ShareIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <Share width={20} height={20} {...props} />
);
