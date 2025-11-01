// src/assets/icons/icons.tsx
import * as React from "react";

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
