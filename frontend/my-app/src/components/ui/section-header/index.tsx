// src/components/ui/section-header/index.tsx
import React from "react";
import styles from "./style.module.css";

type Size = "sm" | "md" | "lg";
const ICON_SIZE: Record<Size, number> = { sm: 24, md: 28, lg: 32 };

export default function SectionHeader({
  icon,
  title,
  action,
  size = "sm",
}: {
  icon?: React.ReactElement<React.SVGProps<SVGSVGElement>>; // ✅ 수정됨
  title: string;
  action?: React.ReactNode;
  size?: Size;
}) {
  const iconSize = ICON_SIZE[size];

  const sizedIcon =
    icon && React.isValidElement(icon)
      ? React.cloneElement(icon, {
          width: iconSize,
          height: iconSize,
        })
      : icon;

  return (
    <div className={`${styles.header} ${styles[`header--${size}`]}`}>
      <div className={`${styles.left} ${styles[`left--${size}`]}`}>
        {sizedIcon && (
          <span className={`${styles.icon} ${styles[`icon--${size}`]}`}>
            {sizedIcon}
          </span>
        )}
        <h2 className={`${styles.title} ${styles[`title--${size}`]}`}>
          {title}
        </h2>
      </div>
      <div className={`${styles.action} ${styles[`action--${size}`]}`}>
        {action}
      </div>
    </div>
  );
}
