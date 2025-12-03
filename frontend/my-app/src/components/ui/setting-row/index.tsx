import styles from "./style.module.css";

type Props = {
  label: string;
  description?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
};

export default function SettingRow({ label, description, trailing, onClick }: Props) {
  return (
    <button className={styles.row} onClick={onClick} type="button">
      <div className={styles.texts}>
        <div className={styles.label}>{label}</div>
        {description && <div className={styles.desc}>{description}</div>}
      </div>
      {trailing ?? <span className={styles.chev} aria-hidden>›</span>}
    </button>
  );
}
