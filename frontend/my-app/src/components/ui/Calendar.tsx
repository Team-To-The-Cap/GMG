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
  /** ▼ 결과 표시용 옵션들 */
  interactive?: boolean; // 기본 true. false면 클릭/드래그 완전 비활성
  availability?: Record<number, number>; // day(1~31) -> 가능한 인원 수
  maxAvailability?: number;              // 최대 인원(색 정규화 기준). 없으면 availability의 max 사용
  onDayClick?: (day: number) => void; 
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
  interactive = true,
  availability,
  maxAvailability,
  onDayClick,
}: CalendarProps) {
  /** 내부 선택 상태: 일(day) 숫자 Set */
  const [selected, setSelected] = useState<Set<number>>(new Set(initialSelected));
  const [dragMode, setDragMode] = useState<DragMode>("idle");
  const isPointerDown = useRef(false);

  React.useEffect(() => {
    // initialSelected가 변경될 때마다 상태를 재설정
    setSelected(new Set(initialSelected));
  }, [year, month, JSON.stringify(initialSelected)]);

  const grid = useMemo(() => buildGrid(year, month, apiDays), [year, month, apiDays]);

  const maxAvail = useMemo(() => {
    if (!availability) return 0;
    if (typeof maxAvailability === "number") return Math.max(1, maxAvailability);
    return Math.max(1, ...Object.values(availability));
  }, [availability, maxAvailability]);

  const colorFor = (day: number) => {
    if (!availability) return null;
    const cnt = availability[day] ?? 0;
    if (cnt <= 0) return null;
    const t = Math.min(1, Math.max(0, cnt / maxAvail)); // 0~1
    // 진파랑(#3e93fa) → 아주 옅은 하늘색 쪽으로 보간
    // hsl 보간(파랑 210deg 근처) : L을 높이며 옅게
    const lightness = 40 + Math.round((1 - t) * 40); // t=1 -> L=40(진), t=0.25 -> L=70 등
    const bg = `hsl(210 90% ${lightness}%)`;
    const fg = lightness < 55 ? "#fff" : "#0b2540";   // 진하면 흰글자, 옅으면 진남
    return { bg, fg };
  };

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

  const canInteract = interactive === true;

  const handleDown = (day: number, disabled?: boolean) => {
    if (!day || disabled) return;

    if (canInteract) {
      // 1. INTERACTIVE MODE (Drag/Paint)
      isPointerDown.current = true;
      const mode: DragMode = selected.has(day) ? "erase" : "paint";
      setDragMode(mode);
      applySelection([day], mode);
    } else if (onDayClick) {
      // 2. NON-INTERACTIVE MODE (Single Click)
      // interactive가 false일 때, onDayClick이 있으면 실행합니다.
      onDayClick(day);
    }
  };
  
  const handleEnter = (day: number, disabled?: boolean) => {
    if(!canInteract) return;
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

              const paint = !canInteract ? colorFor(day): null;
              
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
                        "w-10 h-10 rounded-full inline-flex items-center justify-center",
                        "p-0 m-0 box-border select-none align-middle",
                        "appearance-none border-0 outline-none ring-0 focus:outline-none focus:ring-0",
                        "transition-colors duration-150 ease-in-out shadow-none",
                        isDisabled ? "opacity-40 pointer-events-none" : (canInteract ? "hover:bg-blue-100": ""),
                        canInteract
                          ? (isSelected ? "bg-[#3e93fa] text-white" : "bg-transparent text-[#111]")
                          : "bg-transparent"
                      )}
                      style={{
                        border: "0 none",
                        outline: "none",
                        // ▼ 표시 전용 색 우선 적용
                        backgroundColor: paint ? paint.bg : (canInteract && isSelected ? "#3e93fa" : "transparent"),
                        color: paint ? paint.fg : (canInteract && isSelected ? "#fff" : undefined),
                        boxShadow: paint || (canInteract && isSelected) ? "0 2px 6px rgba(0,0,0,.12)" : "none",
                        cursor: canInteract ? "pointer" : "default",
                      }}
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
