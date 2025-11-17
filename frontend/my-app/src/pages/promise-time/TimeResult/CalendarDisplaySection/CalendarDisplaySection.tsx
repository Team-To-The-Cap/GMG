// src/pages/.../CalendarDisplaySection.tsx
import {
  CheckSquare,
  ChevronLeftIcon,
  ChevronRightIcon,
  Square,
} from "lucide-react";
import { useEffect, useMemo, useState, type JSX } from "react";
import Button from "@/components/ui/button";
import { Calendar } from "@/components/ui/Calendar";
import { useParams } from "react-router-dom";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// 🚨 사용자가 클릭한 날짜에 표시될 세부 정보 (목업 데이터)
const initialDateSelections = [
  {
    date: "2025. 11. 13",
    avatars: [
      "https://c.animaapp.com/mhhdoadq80wQwQ/img/shape-3.png",
      "https://c.animaapp.com/mhhdoadq80wQwQ/img/shape-4.png",
      "https://c.animaapp.com/mhhdoadq80wQwQ/img/shape-2.png",
    ],
    extraCount: 1,
    borderColor: "border-[#41a0f4]",
    isSelected: false,
  },
  {
    date: "2025. 11. 14",
    avatars: [
      "https://c.animaapp.com/mhhdoadq80wQwQ/img/shape-3.png",
      "https://c.animaapp.com/mhhdoadq80wQwQ/img/shape-4.png",
    ],
    extraCount: 0,
    borderColor: "border-[#cce2fc]",
    isSelected: false,
  },
];

export const CalendarDisplaySection = (): JSX.Element => {
  const { promiseId } = useParams();

  // ✅ 오늘 날짜 기준으로 초기 year/month 세팅
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(() => today.getFullYear());
  const [month, setMonth] = useState(() => today.getMonth()); // 0-based

  const [clickedDay, setClickedDay] = useState<number | null>(null);
  const [selections, setSelections] = useState(initialDateSelections);

  const [participants, setParticipants] = useState<any[]>([]);
  const participantCount = participants.length;

  useEffect(() => {
    const fetchParticipants = async () => {
      const res = await fetch(
        `http://223.130.152.114:8001/meetings/${promiseId}/participants`
      );
      const data = await res.json();
      setParticipants(data);
    };

    fetchParticipants();
  }, [promiseId]);

  const [meetingPlan, setMeetingPlan] = useState<any>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      const res = await fetch(
        `http://223.130.152.114:8001/meetings/${promiseId}/plans`
      );
      const data = await res.json();
      setMeetingPlan(data);
    };

    fetchPlan();
  }, [promiseId]);

  //   const ymKey = useMemo(
  //     () => `${year}-${String(month + 1).padStart(2, "0")}`,
  //     [year, month]
  //   );
  // ymKey는 필요하면 캐싱 key로 사용 가능 (지금은 로그/debug 용)

  // ✅ 현재 월의 날짜별 "가능 인원 수" 맵 생성
  const currentMonthAvailability = useMemo(() => {
    if (!meetingPlan) return {};

    // meetingPlan이 배열로 올 수도 있고, 객체로 올 수도 있다고 가정
    const plan = Array.isArray(meetingPlan) ? meetingPlan[0] : meetingPlan;

    if (!plan || !Array.isArray(plan.available_dates)) return {};

    const result: Record<number, number> = {};

    plan.available_dates.forEach((d: any) => {
      // d.date: "2025-11-13" 같은 문자열이라고 가정
      const dt = new Date(d.date);
      if (Number.isNaN(dt.getTime())) return; // 파싱 실패하면 스킵

      const y = dt.getFullYear();
      const m = dt.getMonth(); // 0 기반 (0 = 1월)
      const day = dt.getDate(); // 1~31

      // 현재 보고 있는 year/month와 같을 때만 사용
      if (y === year && m === month) {
        // 백엔드에서 이 날짜에 가능한 인원 수를 같이 넘겨준다고 가정
        // 예: d.available_count
        const availableCount =
          typeof d.available_count === "number"
            ? d.available_count
            : participantCount || 1; // 없으면 일단 색 보이게 1 이상으로

        result[day] = availableCount;
      }
    });

    return result;
  }, [meetingPlan, year, month, participantCount]);

  // ✅ 색상 스케일의 기준이 될 최대 인원 수
  //   const maxAvailability = useMemo(() => {
  //     const values = Object.values(currentMonthAvailability);
  //     if (values.length === 0) return 0;
  //     return Math.max(...values);
  //   }, [currentMonthAvailability]);
  const maxAvailability = participantCount;

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  };

  const handleDayClick = (day: number) => {
    console.log("✅ Clicked:", day);
    if (currentMonthAvailability[day] == null) {
      setClickedDay(null);
      return;
    }
    setClickedDay((prev) => (prev === day ? null : day));
  };

  const toggleSelection = (index: number) => {
    if (index < 0) return;
    setSelections((prevSelections) =>
      prevSelections.map((item, idx) =>
        idx === index ? { ...item, isSelected: !item.isSelected } : item
      )
    );
  };

  const filteredSelections = useMemo(() => {
    if (clickedDay === null) return [];

    const dateString = `${year}. ${String(month + 1).padStart(
      2,
      "0"
    )}. ${String(clickedDay).padStart(2, "0")}`;

    return selections.filter((item) => item.date === dateString);
  }, [clickedDay, year, month, selections]);

  return (
    <section className="flex z-1 w-full relative flex-col items-end gap-[17px] pt-[17px] pb-[13px] px-5 bg-[#f7f7f7]">
      <h2 className="w-full font-['Aleo',Helvetica] font-bold text-black text-xl tracking-[0.50px] leading-4 whitespace-nowrap">
        일정 조율 결과
      </h2>

      {/* 카드(하얀 배경, 라운드, 그림자) */}
      <div className="w-full bg-white rounded-[18px] border border-[#eaeaea] shadow-[0px_4px_32px_#aaaaaa08]">
        <div className="flex flex-col gap-6 px-[25px] py-[30px]">
          {/* 헤더: 월/년 + 이동 버튼 */}
          <header className="flex items-center justify-between w-full">
            <h3 className="font-bold text-[#1c1c1c] text-xl leading-normal">
              {MONTHS[month]} {year}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="w-7 h-7 grid place-items-center hover:opacity-70"
                aria-label="이전 달"
                type="button"
              >
                <ChevronLeftIcon className="w-5 h-5 text-[#1c1c1c]" />
              </button>
              <button
                onClick={nextMonth}
                className="w-7 h-7 grid place-items-center hover:opacity-70"
                aria-label="다음 달"
                type="button"
              >
                <ChevronRightIcon className="w-5 h-5 text-[#1c1c1c]" />
              </button>
            </div>
          </header>

          {/* 실제 날짜 그리드 */}
          <div className="flex flex-col gap-[11px]">
            <Calendar
              year={year}
              month={month}
              interactive={false}
              availability={currentMonthAvailability}
              maxAvailability={maxAvailability}
              onDayClick={handleDayClick}
            />
          </div>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-[#3e93fa] rounded-[10px]" />
          <span className="font-['Roboto',Helvetica] font-medium text-black text-xs text-center tracking-[0] leading-[normal] whitespace-nowrap">
            모두 가능
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-[#cce2fc] rounded-[10px]" />
          <span className="font-['Roboto',Helvetica] font-medium text-black text-xs text-center tracking-[0] leading-[normal] whitespace-nowrap">
            일부 가능
          </span>
        </div>
      </div>

      {/* 클릭된 날짜 정보 (목업) */}
      {filteredSelections.length > 0 && (
        <div className="w-full flex flex-col gap-2.5 items-center">
          {filteredSelections.map((selection, index) => (
            <div
              key={`selection-${index}`}
              className={`w-full h-[51px] bg-white rounded-[13px] overflow-hidden border-2 border-solid ${selection.borderColor} flex items-center justify-between px-4 cursor-pointer`}
              onClick={() =>
                toggleSelection(
                  selections.findIndex((item) => item.date === selection.date)
                )
              }
            >
              <span className="font-['Inria_Sans',Helvetica] font-normal text-black text-xl text-center tracking-[0.50px] leading-6 whitespace-nowrap">
                {selection.date}
              </span>

              <div className="flex items-center gap-2.5">
                <div className="flex items-end justify-end gap-1">
                  {selection.avatars.map((avatar, avatarIndex) => (
                    <div
                      key={`avatar-${index}-${avatarIndex}`}
                      className="w-6 h-6 rounded-full bg-cover bg-center bg-no-repeat border border-white"
                      style={{ backgroundImage: `url(${avatar})` }}
                    />
                  ))}
                  {selection.extraCount > 0 && (
                    <div className="flex flex-col w-6 h-6 items-center justify-center bg-neutral-100 rounded-lg overflow-hidden border border-white">
                      <span className="font-medium text-[#757575] text-xs text-center tracking-[0] leading-[normal] not-italic">
                        +{selection.extraCount}
                      </span>
                    </div>
                  )}
                </div>

                {selection.isSelected ? (
                  <CheckSquare className="w-6 h-6 text-[#3E93FA]" />
                ) : (
                  <Square className="w-6 h-6 text-[#BDBDBD]" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Button variant="primary" size="lg" style={{ width: "100%" }}>
        선택 완료
      </Button>
    </section>
  );
};
