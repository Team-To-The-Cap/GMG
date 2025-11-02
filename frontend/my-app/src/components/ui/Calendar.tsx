import React, { useMemo, useRef, useState } from "react";
import { cn } from "@/utils/utils"; // cn utility is necessary

type DragMode = "idle" | "paint" | "erase";

interface CalendarCell {
  day: number | null;
  disabled?: boolean;
}

export interface CalendarProps {
  year: number; // 예: 2025
  month: number; // 0~11 (예: 9 = October)
  onSelect?: (dates: Date[]) => void; // 선택된 날짜 목록
  apiDays?: Partial<Record<number, { disabled?: boolean }>>;
  className?: string;
  initialSelected?: number[];
}

/** month/year로 5×7 그리드 생성 (항상 35칸) — 월요일 시작 기준 */
function buildGrid(
  year: number,
  month: number,
  apiDays?: CalendarProps["apiDays"]
): CalendarCell[][] {
  const first = new Date(year, month, 1);
  const dow = first.getDay(); // 0=일,1=월,...6=토
  const mondayIndex = (dow + 6) % 7; // 월=0, ..., 일=6 로 보정
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < mondayIndex; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, disabled: apiDays?.[d]?.disabled });
  }
  while (cells.length < 35) cells.push({ day: null });

  const grid: CalendarCell[][] = [];
  for (let r = 0; r < 5; r++) grid.push(cells.slice(r * 7, r * 7 + 7));
  return grid;
}

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

export function Calendar({
  year,
  month,
  onSelect,
  apiDays,
  className,
  initialSelected = [],
}: CalendarProps) {
  /** 내부 선택 상태: 일(day) 숫자 Set */
  const [selected, setSelected] = useState<Set<number>>(new Set(initialSelected));
  const [dragMode, setDragMode] = useState<DragMode>("idle");
  const isPointerDown = useRef(false);

  React.useEffect(() => {
    // initialSelected가 변경될 때마다 상태를 재설정
    setSelected(new Set(initialSelected));
  }, [year, month, initialSelected]);

  const grid = useMemo(() => buildGrid(year, month, apiDays), [year, month, apiDays]);

  const applySelection = (days: number[], mode: DragMode) => {
    if (mode === "idle") return;
    const next = new Set(selected);
    if (mode === "paint") days.forEach((d) => next.add(d));
    else if (mode === "erase") days.forEach((d) => next.delete(d));
    setSelected(next);

    // 부모에 Date[]로 알림
    const picked = Array.from(next).sort((a, b) => a - b).map((d) => new Date(year, month, d));
    onSelect?.(picked);
  };

  const handleDown = (day: number, disabled?: boolean) => {
    if (!day || disabled) return;
    isPointerDown.current = true;
    const mode: DragMode = selected.has(day) ? "erase" : "paint";
    setDragMode(mode);
    applySelection([day], mode);
  };

  const handleEnter = (day: number, disabled?: boolean) => {
    if (!isPointerDown.current || !day || disabled) return;
    applySelection([day], dragMode);
  };

  const endDrag = () => {
    isPointerDown.current = false;
    setDragMode("idle");
  };

  React.useEffect(() => {
    const up = () => endDrag();
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
    };
  }, []);

  return (
    // wrap: flex column, gap 12px, width 100%
    <div className={cn("flex flex-col gap-3 w-full", className)}>
      {/* 요일 라벨 (weekHeader) */}
      <div className="grid grid-cols-7 gap-px mb-2">
        {WEEKDAYS.map((d) => (
          // weekHeaderCell: h-7, center, font-semibold, text-sm, text-gray-800
          <div key={d} className="h-7 flex items-center justify-center font-semibold text-sm text-gray-700">
            {d}
          </div>
        ))}
      </div>

      {/* 5×7 날짜 그리드 (grid) */}
      {/* grid: flex column, gap 11px, user-select: none */}
      <div className="flex flex-col gap-[11px] select-none" onMouseLeave={endDrag}>
        {grid.map((row, rIdx) => (
          // row: grid 7 columns, gap 3px
          <div key={rIdx} className="grid grid-cols-7 gap-px">
            {row.map((cell, cIdx) => {
              const day = cell.day ?? 0;
              const isSelected = !!cell.day && selected.has(day);
              const isDisabled = !!cell.disabled;
              
              // cell: center, height 43px
              return (
                <div key={`${rIdx}-${cIdx}`} className="h-[43px] flex items-center justify-center">
                  {cell.day ? (
                    <button
                      type="button"
                      data-day={day}
                      aria-pressed={isSelected}
                      disabled={isDisabled}
                      onMouseDown={() => handleDown(day, isDisabled)}
                      onMouseEnter={() => handleEnter(day, isDisabled)}
                      onTouchStart={() => handleDown(day, isDisabled)}
                      onTouchMove={(e) => {
                        const t = e.touches[0];
                        const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null;
                        const key = el?.getAttribute?.("data-day");
                        if (key) handleEnter(Number(key), isDisabled);
                      }}
                      onTouchEnd={endDrag}
                      // dayBtn: 40x40, rounded-full, transition
                      className={cn(
                      "h-10 w-10 rounded-full inline-flex items-center justify-center border-0 cursor-pointer transition-colors duration-150 ease-in-out",
                      isDisabled ? "opacity-40 pointer-events-none" : "hover:bg-blue-100",
                      isSelected ? "bg-blue-500 text-white shadow-md" : "text-gray-700"
                      )}
                    >
                    <span className="font-semibold text-base leading-none">{day}</span>
                    </button>
                  ) : (
                    // daySpacer: 40x40 (빈 칸 자리 채우기)
                    <div className="h-10 w-10" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
