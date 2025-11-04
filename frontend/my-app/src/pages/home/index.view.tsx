// src/pages/home/index.view.tsx
import PromiseCard from "@/components/ui/promise-card";
import styles from "./style.module.css";
import type { PromiseDetail } from "@/types/promise";
import TopBar from "@/components/ui/top-bar";

type Props = {
  loading: boolean;
  error?: string;
  items: PromiseDetail[]; // ← 여기!
  onRetry: () => void;
};

export default function HomeView({ loading, error, items, onRetry }: Props) {
  if (loading) return <div className={styles.state}>불러오는 중…</div>;
  if (error)
    return (
      <div className={styles.state}>
        <p>{error}</p>
        <button onClick={onRetry} className={styles.retryBtn}>
          다시 시도
        </button>
      </div>
    );
  if (!items.length)
    return <div className={styles.state}>아직 약속이 없어요.</div>;

  return (
    <div className={styles.wrap}>
      <TopBar title={`나의 약속`} />
      <div className={styles.list}>
        {items.map((item) => (
          <PromiseCard
            key={item.id}
            title={item.title}
            dday={item.dday}
            participants={item.participants}
            className={styles.card}
          />
        ))}
      </div>
    </div>
  );
}
