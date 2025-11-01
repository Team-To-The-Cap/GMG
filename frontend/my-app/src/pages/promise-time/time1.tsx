import { ChevronLeft, ChevronRight } from "lucide-react";
import {Button} from '@/components/ui/Button';
import {TipBar} from '@/components/ui/TipBar';
import {Card} from '@/components/ui/Card';
import {Calendar} from '@/components/ui/Calendar'; // selected/drag 등 내부구현은 자유

import { useState } from 'react';

export default function Time1() {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [view, setView] = useState(() => {
  const now = new Date(2025, 9, 1); // 시작을 2025-10로
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


  const handleShare = () => {
    // TODO: 링크 생성/복사 로직
  };

  const handleViewResult = () => {
    // TODO: 결과 페이지로 이동 (router)
  };

  return (
    <div className="flex h-dvh w-full flex-col bg-neutral-100">
      {/* 상단 고정 영역 */}
      <div className="sticky top-0 z-10 bg-white">
      </div>

      {/* 스크롤되는 컨텐츠 영역 */}
      <main className="flex-1 overflow-y-auto px-4 py-3">
        <p className="text-neutral-600 mb-2">가능한 날짜를 선택해주세요</p>

        <TipBar message = "">
        </TipBar>

         <Card className="mb-3">
    <header className="mb-2 flex items-center justify-between">
      <h2 className="text-lg font-semibold">{monthLabel}</h2>
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" onClick={prevMonth} aria-label="이전 달">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={nextMonth} aria-label="다음 달">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </header>

    <Calendar
      year={view.year}
      month={view.month}              // 0=Jan ... 11=Dec
      onSelect={setSelectedDates}     // Date[] 반환
      // apiDays={{ 7:{disabled:true} }}  // 필요 시 비활성 등 주입
    />
  </Card>

        <div className="mb-2 flex items-center gap-2 text-sm">
          <span className="text-neutral-700">선택된 날짜</span>
          <button className="text-blue-600 underline">
            {selectedDates.length}개의 날짜
          </button>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex gap-3">
          <Button variant="default" size="lg" onClick={handleShare}>
            공유하기
          </Button>
          <Button variant="secondary" size="lg" onClick={handleViewResult}>
            결과 보기
          </Button>
        </div>
      </main>


      {/* 하단 고정 네비게이션 */}
      <div className="sticky bottom-0 z-10 bg-white">
      </div>
    </div>
  );
}