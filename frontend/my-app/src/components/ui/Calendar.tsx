// src/components/ui/Calendar.tsx
import React, { useMemo, useRef, useState } from "react";
import { cn } from "@/utils/utils";

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
  interactive?: boolean; // true면 드래그 선택, false면 onDayClick만 동작
  availability?: Record<number, number>; // day(1~31) -> 가능한 인원 수
  maxAvailability?: number; // 최대 인원(색 정규화 기준). 없으면 availability의 max 사용
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
  const [selected, setSelected] = useState<Set<number>>(
    new Set(initialSelected)
  );
  const [dragMode, setDragMode] = useState<DragMode>("idle");
  const isPointerDown = useRef(false);

  React.useEffect(() => {
    // initialSelected가 변경될 때마다 상태를 재설정
    setSelected(new Set(initialSelected));
  }, [year, month, JSON.stringify(initialSelected)]);

  const grid = useMemo(
    () => buildGrid(year, month, apiDays),
    [year, month, apiDays]
  );

  const maxAvail = useMemo(() => {
    if (typeof maxAvailability === "number") return maxAvailability; // ← 우선 외부에서 받은 값
    if (!availability) return 0;
    const values = Object.values(availability);
    if (values.length === 0) return 0;
    return Math.max(...values);
  }, [availability, maxAvailability]);

  // ✅ 인원 수에 따른 색상 (모두 가능 / 일부 가능)
  const colorFor = (day: number) => {
    if (!availability || maxAvail <= 0) return null;

    const cnt = availability[day] ?? 0;
    if (cnt <= 0) return null; // 아무도 불가능 → 색 없음

    const ratio = cnt / maxAvail; // 0~1
    // base: 연한 파랑, ratio 높을수록 진하게
    const start = { r: 204, g: 226, b: 252 }; // #cce2fc
    const end = { r: 62, g: 147, b: 250 }; // #3e93fa

    const r = Math.round(start.r + (end.r - start.r) * ratio);
    const g = Math.round(start.g + (end.g - start.g) * ratio);
    const b = Math.round(start.b + (end.b - start.b) * ratio);

    return {
      bg: `rgb(${r}, ${g}, ${b})`,
      fg: ratio > 0.6 ? "#ffffff" : "#0b2540",
    };
  };

  const applySelection = (days: number[], mode: DragMode) => {
    if (mode === "idle") return;
    const next = new Set(selected);
    if (mode === "paint") days.forEach((d) => next.add(d));
    else if (mode === "erase") days.forEach((d) => next.delete(d));
    setSelected(next);

    // 부모에 Date[]로 알림
    const picked = Array.from(next)
      .sort((a, b) => a - b)
      .map((d) => new Date(year, month, d));
    onSelect?.(picked);
  };

  const canInteract = interactive === true;

  // 🔹 드래그 선택용 Pointer 핸들러 (마우스/터치 공통)
  const handlePointerDown = (
    day: number,
    disabled?: boolean,
    e?: React.PointerEvent<HTMLButtonElement>
  ) => {
    if (!day || disabled) return;

    if (!canInteract) {
      // 비인터랙티브 모드에서는 그냥 클릭 한 번만 전달
      onDayClick?.(day);
      return;
    }

    isPointerDown.current = true;
    const mode: DragMode = selected.has(day) ? "erase" : "paint";
    setDragMode(mode);
    applySelection([day], mode);
  };

  const handlePointerEnter = (day: number, disabled?: boolean) => {
    if (!canInteract) return;
    if (!isPointerDown.current || !day || disabled) return;
    applySelection([day], dragMode);
  };

  const endDrag = () => {
    isPointerDown.current = false;
    setDragMode("idle");
  };

  return (
    <div className={cn("flex flex-col gap-3 w-full", className)}>
      {/* 요일 라벨 */}
      <div className="grid grid-cols-7 gap-px mb-2">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="h-7 flex items-center justify-center font-semibold text-sm text-gray-700"
          >
            {d}
          </div>
        ))}
      </div>

      {/* 5×7 날짜 그리드 */}
      <div
        className="flex flex-col gap-[11px] select-none"
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {grid.map((row, rIdx) => (
          <div key={rIdx} className="grid grid-cols-7 gap-px">
            {row.map((cell, cIdx) => {
              const day = cell.day ?? 0;
              const isSelected = !!cell.day && selected.has(day);
              const isDisabled = !!cell.disabled;

              // interactive=false일 때 availability 정보 사용
              const paint = !canInteract ? colorFor(day) : null;

              // 해당 날짜 가능 인원 수 (결과 표시 모드에서 뱃지)
              const cnt = availability?.[day] ?? 0;

              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className="h-[43px] flex items-center justify-center"
                >
                  {cell.day ? (
                    <button
                      type="button"
                      data-day={day}
                      aria-pressed={isSelected}
                      disabled={isDisabled}
                      // 🔹 인터랙티브 모드(드래그 선택)는 Pointer 이벤트로 통합
                      onPointerDown={
                        canInteract
                          ? (e) => handlePointerDown(day, isDisabled, e)
                          : undefined
                      }
                      onPointerEnter={
                        canInteract
                          ? () => handlePointerEnter(day, isDisabled)
                          : undefined
                      }
                      // 🔹 비인터랙티브 모드는 클릭 한 번만
                      onClick={
                        !canInteract
                          ? () => {
                              if (!isDisabled) onDayClick?.(day);
                            }
                          : undefined
                      }
                      className={cn(
                        "w-10 h-10 rounded-full inline-flex items-center justify-center",
                        "relative",
                        "p-0 m-0 box-border select-none align-middle",
                        "appearance-none border-0 outline-none ring-0 focus:outline-none focus:ring-0",
                        "transition-colors duration-150 ease-in-out shadow-none",
                        isDisabled
                          ? "opacity-40 pointer-events-none"
                          : canInteract
                          ? "hover:bg-blue-100"
                          : "",
                        canInteract
                          ? isSelected
                            ? "bg-[#3e93fa] text-white"
                            : "bg-transparent text-[#111]"
                          : "bg-transparent"
                      )}
                      style={{
                        border: "0 none",
                        outline: "none",
                        backgroundColor: paint
                          ? paint.bg
                          : canInteract && isSelected
                          ? "#3e93fa"
                          : "transparent",
                        color: paint
                          ? paint.fg
                          : canInteract && isSelected
                          ? "#fff"
                          : undefined,
                        boxShadow:
                          paint || (canInteract && isSelected)
                            ? "0 2px 6px rgba(0,0,0,.12)"
                            : "none",
                        cursor: canInteract ? "pointer" : "default",
                      }}
                    >
                      {/* 날짜 숫자 */}
                      <span className="font-semibold text-base leading-none">
                        {day}
                      </span>

                      {/* 참석자 수 뱃지 (결과 화면용) */}
                      {cnt > 0 && (
                        <span
                          className="
                            pointer-events-none
                            absolute
                            -top-1
                            -right-1
                            flex
                            items-center
                            justify-center
                            rounded-full
                            text-[10px]
                            font-semibold
                            text-white
                          "
                          style={{
                            minWidth: 16,
                            height: 16,
                            padding: "0 3px",
                            backgroundColor: "#3b3e45",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
                          }}
                        >
                          {cnt}
                        </span>
                      )}
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
  );
}
