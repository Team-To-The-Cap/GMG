// src/pages/home/index.view.tsx
import { useNavigate } from "react-router-dom";
import PromiseCard from "@/components/ui/promise-card";
import SwipeableCard from "@/components/ui/swipeable-card";
import styles from "./style.module.css";
import type { PromiseDetail } from "@/types/promise";
import type { GroupedMeetings, HomeSummary } from "./index";

type Props = {
  loading: boolean;
  error?: string;
  items: PromiseDetail[];
  grouped: GroupedMeetings;
  summary: HomeSummary;
  onRetry: () => void;
  onDelete: (id: string) => void;
};

export default function HomeView({
  loading,
  error,
  items,
  grouped,
  summary,
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

  const hasAny =
    items.length > 0 ||
    grouped.unscheduled.length > 0 ||
    grouped.upcoming.length > 0 ||
    grouped.past.length > 0;

  if (!hasAny) {
    return (
      <div className={styles.emptyWrap}>
        <div className={styles.header}>
          <div className={styles.headerTextMain}>안녕하세요 👋</div>
          <div className={styles.headerTextSub}>
            아직 등록된 약속이 없어요.
            <br />
            아래 <span className={styles.highlight}>약속추가</span> 버튼으로 첫
            약속을 만들어보세요!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {/* 상단 프로필/요약 헤더 */}
      <section className={styles.headerSection}>
        <div className={styles.headerAvatar} />
        <div className={styles.headerTexts}>
          <div className={styles.headerTextMain}>안녕하세요 👋</div>
          <div className={styles.headerTextSub}>
            이번 주 예정된 약속{" "}
            <span className={styles.highlight}>
              {summary.upcomingThisWeekCount}개
            </span>
            가 있어요.
          </div>
        </div>
      </section>
      {/* 위젯 그리드 */}
      <section className={styles.widgetsSection}>
        <div className={styles.widgetsGrid}>
          <WidgetCard
            label="오늘 입력해야 할 일정"
            value={
              summary.todoScheduleCount > 0
                ? `${summary.todoScheduleCount}개`
                : "없어요"
            }
            emoji="✔"
          />
          <WidgetCard
            label="7일 내 예정된 약속"
            value={`${summary.upcomingThisWeekCount}개`}
            emoji="⏱"
          />
          <WidgetCard
            label="이번 달 모임"
            value={`${summary.thisMonthCount}회`}
            emoji="🏆"
          />
          <WidgetCard
            label="참가자 응답률"
            value={
              summary.avgResponseRate != null
                ? `${summary.avgResponseRate}%`
                : "데이터 부족"
            }
            emoji="🎯"
          />
        </div>
      </section>

      {/* 다가오는 약속 섹션 */}
      {grouped.upcoming.length > 0 && (
        <Section
          title="다가오는 약속"
          badge={`${grouped.upcoming.length}개`}
          icon="⏰"
        >
          {grouped.upcoming.map((item) => (
            <SwipeableCard
              key={item.id}
              onCardClick={() => navigate(`/details/${item.id}`)}
              onDeleteRequest={() => onDelete(item.id)}
            >
              <PromiseCard
                variant="compact" // ✅ 여기도
                title={item.title}
                dday={item.dday ?? undefined}
                participants={item.participants}
                className={styles.card}
                unscheduled={!item.schedule?.dateISO}
              />
            </SwipeableCard>
          ))}
        </Section>
      )}

      {/* 미정 약속 섹션 */}
      {grouped.unscheduled.length > 0 && (
        <Section
          title="미정 약속"
          badge={`${grouped.unscheduled.length}개`}
          icon="📍"
        >
          {grouped.unscheduled.map((item) => (
            <SwipeableCard
              key={item.id}
              onCardClick={() => navigate(`/details/${item.id}`)}
              onDeleteRequest={() => onDelete(item.id)}
            >
              <PromiseCard
                variant="compact" // ✅ 2열용 컴팩트 카드
                title={item.title}
                dday={item.dday ?? undefined}
                participants={item.participants}
                className={styles.card}
                unscheduled={!item.schedule?.dateISO}
              />
            </SwipeableCard>
          ))}
        </Section>
      )}

      {/* 지난 약속 섹션 */}
      {grouped.past.length > 0 && (
        <Section title="지난 약속" badge={`${grouped.past.length}개`} icon="📁">
          {grouped.past.map((item) => (
            <SwipeableCard
              key={item.id}
              onCardClick={() => navigate(`/details/${item.id}`)}
              onDeleteRequest={() => onDelete(item.id)}
            >
              <PromiseCard
                variant="compact" // ✅ 여기도
                title={item.title}
                dday={item.dday ?? undefined}
                participants={item.participants}
                className={styles.card}
                unscheduled={!item.schedule?.dateISO}
              />
            </SwipeableCard>
          ))}
        </Section>
      )}
      <div className={styles.bottomSpacer} />
    </div>
  );
}

/** 섹션 공통 래퍼 */
type SectionProps = {
  title: string;
  badge?: string;
  icon?: string;
  children: React.ReactNode;
};

function Section({ title, badge, icon, children }: SectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleWrap}>
          {icon && <span className={styles.sectionIcon}>{icon}</span>}
          <h2 className={styles.sectionTitle}>{title}</h2>
        </div>
        {badge && <span className={styles.sectionBadge}>{badge}</span>}
      </div>
      <div className={styles.sectionList}>{children}</div>
    </section>
  );
}

type WidgetCardProps = {
  emoji: string;
  label: string;
  value: string;
};

function WidgetCard({ emoji, label, value }: WidgetCardProps) {
  return (
    <div className={styles.widgetCard}>
      <div className={styles.widgetEmoji}>{emoji}</div>
      <div className={styles.widgetLabel}>{label}</div>
      <div className={styles.widgetValue}>{value}</div>
    </div>
  );
}
