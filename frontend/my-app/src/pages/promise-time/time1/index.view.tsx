import IconButton from "@/components/ui/IconButton/IconButton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import Button from "@/components/ui/button";
import TipBar from "@/components/ui/TipBar";
import { Calendar } from "@/components/ui/Calendar";
import styles from "./style.module.css";

type Props = {
  monthLabel: string;
  view: { year: number; month: number };
  onPrevMonth: () => void;
  onNextMonth: () => void;

  selectedDates: Date[];
  onSelectDates: (dates: Date[]) => void;

  onSubmit: () => void;
  onShare: () => void;
};

export default function Time1View({
  monthLabel,
  view,
  onPrevMonth,
  onNextMonth,
  selectedDates,
  onSelectDates,
  onSubmit,
  onShare,
}: Props) {
  return (
    <div className={styles.root}>
      {/* 상단 고정 영역 (필요 시 TopBar 배치) */}
      <div className={styles.topFixed} />

      {/* 스크롤 영역 */}
      <main className={styles.scrollArea}>
        <p className={styles.helperText}>가능한 날짜를 선택해주세요</p>

        <TipBar message="날짜를 클릭하거나 드래그해서 여러 날짜를 선택할 수 있어요" />

        <Panel className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2 className={styles.monthTitle}>{monthLabel}</h2>
            <div className={styles.navBtns}>
              <IconButton
                aria-label="이전 달"
                variant="ghost"
                size="md"
                icon={<ChevronLeft className="w-4 h-4" />}
                onClick={onPrevMonth}
              />
              <IconButton
                aria-label="다음 달"
                variant="ghost"
                size="md"
                icon={<ChevronRight className="w-4 h-4" />}
                onClick={onNextMonth}
              />
            </div>
          </header>

          <Calendar
            year={view.year}
            month={view.month}
            onSelect={onSelectDates}         // Date[] 반환 (이미 맞춰놓음)
            // apiDays={{ 7: { disabled: true } }}  // 필요 시 비활성 주입
          />
        </Panel>

        <div className={styles.selectedInfo}>
          <span className={styles.selectedLabel}>선택된 날짜</span>
          <button className={styles.selectedLink} onClick={onShare}>
            {selectedDates.length}개의 날짜
          </button>
        </div>

        <div className={styles.actionRow}>
          <Button variant="primary" size="lg" fullWidth onClick={onSubmit}>
            선택 완료
          </Button>
        </div>
      </main>

      {/* 하단 고정 영역 (BottomNav 자리) */}
      <div className={styles.bottomFixed} />
    </div>
  );
}