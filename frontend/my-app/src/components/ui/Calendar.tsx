// src/components/ui/Calendar.tsx
import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
import { Button } from "./Button";
import { Card, CardContent } from "./Card";
import { cn } from "@/utils/utils";

const weekDays = ["월", "화", "수", "목", "금", "토", "일"];

type DragMode = "idle" | "paint" | "erase";

interface CalendarCell {
  day: number | null;     // null = 빈칸
  disabled?: boolean;     // API로 비활성 처리 가능
}

interface CalendarProps {
  year: number;           // 2025
  month: number;          // 0~11 (JS Date 규칙) (예: 9 = October)
  onSelect?: (days: Date[]) => void; // 선택된 '일(day)' 숫자들
  apiDays?: Partial<Record<number, { disabled?: boolean }>>; // API로 날짜 속성 주입
  className?: string;
}

/** month/year로 5×7 그리드 생성 (요구에 맞춰 '항상 5주') */
function buildGrid(year: number, month: number, apiDays?: CalendarProps["apiDays"]): CalendarCell[][] {
  const first = new Date(year, month, 1);
  // 월요일 시작 기준으로 오프셋 계산 (JS: 0=일요일 → 월=1)
  const dow = first.getDay(); // 0..6
  const mondayIndex = (dow + 6) % 7; // 월=0, 화=1, ... 일=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: CalendarCell[] = [];
  // 앞쪽 비어있는 칸
  for (let i = 0; i < mondayIndex; i++) cells.push({ day: null });
  // 1일부터 채우기
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, disabled: apiDays?.[d]?.disabled });
  }
  // 뒤쪽 빈칸으로 채워 총 35칸(5×7)
  while (cells.length < 35) cells.push({ day: null });

  // 5행으로 자르기
  const grid: CalendarCell[][] = [];
  for (let r = 0; r < 5; r++) grid.push(cells.slice(r * 7, r * 7 + 7));
  return grid;
}

export function Calendar({
  year,
  month,
  onSelect,
  apiDays,
  className
}: CalendarProps) {
  // 선택 상태는 '일(day) 숫자'의 Set으로 관리
  const [selected, setSelected] = useState<Set<number>>(new Set([8, 31])); // 초기 데모
  const [dragMode, setDragMode] = useState<DragMode>("idle");
  const isPointerDown = useRef(false);

  const grid = useMemo(() => buildGrid(year, month, apiDays), [year, month, apiDays]);

  // 내부 헬퍼
  const applySelection = (days: number[], mode: DragMode) => {
    if (mode === "idle") return;
    const next = new Set(selected);
    if (mode === "paint") {
      days.forEach(d => next.add(d));
    } else if (mode === "erase") {
      days.forEach(d => next.delete(d));
    }
    setSelected(next);
     const sortedDays = Array.from(next).sort((a, b) => a - b);
     const pickedDates = sortedDays.map((d) => new Date(year, month, d));
     onSelect?.(pickedDates);
  };

  const handleCellPointerDown = (day: number, disabled?: boolean) => {
    if (!day || disabled) return;
    isPointerDown.current = true;

    // 시작 칸이 이미 선택되어 있으면 erase, 아니면 paint
    const mode: DragMode = selected.has(day) ? "erase" : "paint";
    setDragMode(mode);
    applySelection([day], mode);
  };

  const handleCellPointerEnter = (day: number, disabled?: boolean) => {
    if (!isPointerDown.current || !day || disabled) return;
    applySelection([day], dragMode);
  };

  const endDrag = () => {
    isPointerDown.current = false;
    setDragMode("idle");
  };

  // PC 마우스 + 터치 둘 다 지원
  // 컨테이너에서 포인터 업 처리(밖에서 떼어도 종료되도록)
  React.useEffect(() => {
    const up = () => endDrag();
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
    };
  }, []);

  // 월 텍스트
  const monthLabel = new Date(year, month, 1).toLocaleString("ko-KR", { month: "long", year: "numeric" });

  return (
    <Card className={cn(
      "w-full bg-white rounded-[18px] border border-[#eaeaea] shadow-[0px_4px_32px_#aaaaaa08]",
      className
    )}>
      <CardContent className="flex flex-col items-start gap-6 px-[25px] py-[30px] select-none">
        {/* 헤더 */}
        <header className="w-full flex items-center justify-between">
          <h3 className="font-bold text-lg text-[#222]">{monthLabel}</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-auto w-auto p-0 hover:bg-transparent" aria-label="이전 달">
              <ChevronLeft className="w-4 h-4 text-[#222]" />
            </Button>
            <Button variant="ghost" size="icon" className="h-auto w-auto p-0 hover:bg-transparent" aria-label="다음 달">
              <ChevronRight className="w-4 h-4 text-[#222]" />
            </Button>
          </div>
        </header>

        {/* 요일 헤더 */}
        <div className="w-full">
          <div className="grid grid-cols-7 gap-0 mb-3">
            {weekDays.map((d) => (
              <div key={d} className="flex items-center justify-center text-[#222] text-sm font-medium">{d}</div>
            ))}
          </div>

          {/* 날짜 그리드 (5×7) */}
          <div
            className="flex flex-col gap-[11px]"
            onMouseLeave={endDrag}
          >
            {grid.map((row, rIdx) => (
              <div key={rIdx} className="grid grid-cols-7 gap-0">
                {row.map((cell, cIdx) => {
                  const day = cell.day ?? 0;
                  const isSelected = !!cell.day && selected.has(day);
                  const isDisabled = !!cell.disabled;

                  return (
                    <div key={`${rIdx}-${cIdx}`} className="flex items-center justify-center h-[43px]">
                      {cell.day ? (
                        <button
                          type="button"
                          disabled={isDisabled}
                          aria-pressed={isSelected}
                          onMouseDown={() => handleCellPointerDown(day, isDisabled)}
                          onMouseEnter={() => handleCellPointerEnter(day, isDisabled)}
                          onTouchStart={() => handleCellPointerDown(day, isDisabled)}
                          onTouchMove={(e) => {
                            // 터치 위치의 요소를 찾아서 enter 처리
                            const touch = e.touches[0];
                            const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
                            const key = el?.getAttribute?.("data-day");
                            if (key) handleCellPointerEnter(Number(key), isDisabled);
                          }}
                          onTouchEnd={endDrag}
                          data-day={day}
                          className={cn(
                            "h-10 w-10 rounded-full transition-colors flex items-center justify-center",
                            isSelected
                              ? "bg-[#3e93fa] text-white"
                              : "bg-transparent text-[#444]",
                            isDisabled && "opacity-40 pointer-events-none"
                          )}
                        >
                          <span className="text-[15px] font-medium">{day}</span>
                        </button>
                      ) : (
                        <div className="h-10 w-10" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
