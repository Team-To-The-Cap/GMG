import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./iconbutton.module.css";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;                                   // 필수: 아이콘 노드
  variant?: "default" | "ghost" | "primary";         // 팀 버튼과 동일한 분류
  size?: "sm" | "md" | "lg";                         // 원형 크기
};

/** 아이콘 전용 원형 버튼 */
export default function IconButton({
  icon,
  variant = "ghost",
  size = "md",
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={[
        styles.iconButton,
        styles[variant],
        styles[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      <span className={styles.icon}>{icon}</span>
    </button>
  );
}