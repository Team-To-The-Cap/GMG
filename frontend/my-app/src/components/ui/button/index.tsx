import styles from "./style.module.css";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "primary";
  size?: "xs" | "sm" | "md" | "lg";
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
};

export default function Button({
  variant = "default",
  size = "md",
  fullWidth,
  iconLeft,
  iconRight,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[
        styles.btn,
        styles[variant],
        styles[size],
        fullWidth ? styles.fullwidth : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {iconLeft && <span className={styles.icon}>{iconLeft}</span>}
      <span className={styles.label}>{children}</span>
      {iconRight && <span className={styles.icon}>{iconRight}</span>}
    </button>
  );
}
