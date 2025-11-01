import styles from "./style.module.css";

export default function SectionHeader({
  icon,
  title,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={styles.header}>
      <div className={styles.left}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <h2 className={styles.title}>{title}</h2>
      </div>
      {action}
    </div>
  );
}
