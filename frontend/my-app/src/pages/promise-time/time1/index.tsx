import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Time1View from "./index.view";

export default function Time1() {
  // URL로 진입: /time/time1
  const navigate = useNavigate();

  // 달력 상태
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [view, setView] = useState(() => {
    const now = new Date(2025, 9, 1); // 2025-10 시작
    return { year: now.getFullYear(), month: now.getMonth() }; // month: 0~11
  });

  const monthLabel = new Date(view.year, view.month, 1).toLocaleString("ko-KR", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () =>
    setView(v => (v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }));
  const nextMonth = () =>
    setView(v => (v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }));

  const handleSubmit = () => {
    // TODO: 선택 결과 저장/전송
    // 완료 후 결과 페이지로 이동 예시:
    navigate("/time/result");
  };

  const handleShare = () => {
    // TODO: 공유 링크 생성/복사
  };

  return (
    <Time1View
      monthLabel={monthLabel}
      view={view}
      onPrevMonth={prevMonth}
      onNextMonth={nextMonth}
      selectedDates={selectedDates}
      onSelectDates={setSelectedDates}
      onSubmit={handleSubmit}
      onShare={handleShare}
    />
  );
}