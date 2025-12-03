import styles from "./style.module.css";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "primary";
  size?: "xs" | "sm" | "md" | "lg";
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;

  /** 아이콘만 있는 버튼 (정사각형) */
  iconOnly?: boolean;
  /** 단일 아이콘을 간단히 넘길 때 */
  icon?: React.ReactNode;
};

export default function Button({
  variant = "default",
  size = "md",
  fullWidth,
  iconLeft,
  iconRight,
  iconOnly,
  icon,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    styles.btn,
    styles[variant],
    styles[size],
    iconOnly ? styles.iconOnly : "",
    fullWidth ? styles.fullWidth : "", // ✅ 케이스 수정 (fullwidth → fullWidth)
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // iconOnly 우선순위: icon > iconLeft > iconRight > children
  const renderContent = () => {
    if (iconOnly) {
      const only =
        icon ??
        iconLeft ??
        iconRight ??
        (typeof children === "string" ? children : null);
      return <span className={styles.icon}>{only}</span>;
    }

    // 일반 버튼 (아이콘 + 라벨)
    return (
      <>
        {iconLeft && <span className={styles.icon}>{iconLeft}</span>}
        <span className={styles.label}>{children}</span>
        {iconRight && <span className={styles.icon}>{iconRight}</span>}
      </>
    );
  };

  return (
    <button className={classes} {...rest}>
      {renderContent()}
    </button>
  );
}
