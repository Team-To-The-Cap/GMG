// src/pages/home/index.view.tsx
import { useNavigate } from "react-router-dom";
import PromiseCard from "@/components/ui/promise-card";
import SwipeableCard from "@/components/ui/swipeable-card";
import styles from "./style.module.css";
import type { PromiseDetail } from "@/types/promise";

type Props = {
  loading: boolean;
  error?: string;
  items: PromiseDetail[];
  onRetry: () => void;
  onDelete: (id: string) => void;
};

export default function HomeView({
  loading,
  error,
  items,
  onRetry,
  onDelete,
}: Props) {
  const navigate = useNavigate();

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
      <div className={styles.list}>
        {items.map((item) => (
          <SwipeableCard
            key={item.id}
            onCardClick={() => navigate(`/details/${item.id}`)}
            onDeleteRequest={() => onDelete(item.id)}
          >
            <PromiseCard
              title={item.title}
              dday={item.dday}
              participants={item.participants}
              className={styles.card}
            />
          </SwipeableCard>
        ))}
      </div>
    </div>
  );
}
