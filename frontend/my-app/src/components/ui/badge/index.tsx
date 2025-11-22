import styles from "./style.module.css";

export default function Badge({
  children,
  color = "danger",
}: {
  children: React.ReactNode;
  color?: "danger" | "primary" | "muted";
}) {
  return (
    <span className={[styles.badge, styles[color]].join(" ")}>{children}</span>
  );
}
