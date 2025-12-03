import styles from "./tipbar.module.css";

type TipBarProps = {
  message: string;
  className?: string; // 필요하면 외부에서 여백 등 추가
};

export default function TipBar({ message, className }: TipBarProps) {
  return (
    <div role="note" className={[styles.tip, className].filter(Boolean).join(" ")}>
      <span aria-hidden className={styles.icon}>💡</span>
      <p className={styles.text}>
        <strong className={styles.strong}>Tip :</strong>{" "}
        {message}
      </p>
    </div>
  );
}