import styles from "./style.module.css";

type Props = {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  emoji?: string;
  /** pill = 가로형, stack = 이모지 위 + 라벨 아래 */
  variant?: "pill" | "stack";
};

export default function PreferenceChip({
  label, selected, onClick, emoji, variant = "pill",
}: Props) {
  const cls =
    variant === "stack"
      ? `${styles.chip} ${styles.stack} ${selected ? styles.selected : ""}`
      : `${styles.chip} ${selected ? styles.selected : ""}`;

  return (
    <button type="button" className={cls} onClick={onClick} aria-pressed={!!selected}>
      {variant === "stack" ? (
        <>
          <span className={styles.emoji}>{emoji}</span>
          <span className={styles.label}>{label}</span>
        </>
      ) : (
        label
      )}
    </button>
  );
}
