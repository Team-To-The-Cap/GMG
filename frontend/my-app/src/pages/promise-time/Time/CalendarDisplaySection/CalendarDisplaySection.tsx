import { useMemo, useState, type JSX } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/Calendar"; // 네가 만든 드래그/페인트 캘린더
import Button from "@/components/ui/button";
import { useLocation, useNavigate, useParams } from "react-router-dom";

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

const compileSelectedDates = (
  selByMonth: Record<string, number[]>
): string[] => {
  const allDates: string[] = [];

  // selByMonth의 모든 키(예: "2025-10")를 순회
  for (const ymKey in selByMonth) {
    const [yearStr, monthStr] = ymKey.split("-"); // yearStr: "2025", monthStr: "10"
    const days = selByMonth[ymKey]; // days: [8, 31]

    if (days && days.length > 0) {
      // 선택된 day number를 순회하여 YYYY-MM-DD 형식으로 변환
      days.forEach((day) => {
        const dayStr = String(day).padStart(2, "0"); // 8 -> "08"
        allDates.push(`${yearStr}-${monthStr}-${dayStr}`);
      });
    }
  }
  // 날짜 순서로 정렬하여 보내면 백엔드에서 처리하기 더 깔끔할 수 있습니다.
  // (필수 아님, 백엔드에서 정렬 가능)
  return allDates.sort();
};

//날짜 시간순으로 00~24로 변환
const makeFullDayTimes = (dates: string[]) => {
  return dates.map((date) => ({
    start_time: `${date}T00:00:01Z`,
    end_time: `${date}T23:59:59Z`,
  }));
};

export const CalendarDisplaySection = (): JSX.Element => {
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(9); // 0-index (9 = October)

  // 월별 선택 상태 보존: {"2025-10":[8,31], "2025-11":[3,9], ...}
  const [selByMonth, setSelByMonth] = useState<Record<string, number[]>>({});

  const ymKey = useMemo(
    () => `${year}-${String(month + 1).padStart(2, "0")}`,
    [year, month]
  );
  const currentSelectedDays = selByMonth[ymKey] ?? [];

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

  // Calendar에서 올라오는 Date[]를 월별 day number로 저장
  const handleSelect = (dates: Date[]) => {
    const days = dates.map((d) => d.getDate()).sort((a, b) => a - b);
    setSelByMonth((prev) => ({ ...prev, [ymKey]: days }));
  };

  const totalSelectedDaysCount = useMemo(() => {
    let total = 0;
    for (const key in selByMonth) {
      total += selByMonth[key].length;
    }
    return total;
  }, [selByMonth]);

  const location = useLocation();
  const state = location.state as any;
  const nameDraft = state?.nameDraft ?? "";

  const navigate = useNavigate();
  const { promiseId } = useParams();
  const handleSubmit = async () => {
    const datesToSend = compileSelectedDates(selByMonth);
    const availableTimes = makeFullDayTimes(datesToSend);

    navigate(`/details/${promiseId}/participants/new`, {
      state: {
        ...state,
        nameDraft,
        selectedTimes: availableTimes,
      },
    });
  };

  return (
    <section className="flex flex-col items-center justify-center gap-[15px] px-5 py-5 bg-[#f7f7f7]">
      {/* 상단 안내 텍스트 */}
      <h2 className="w-full font-semibold text-black text-lg tracking-[0.3px] leading-7">
        가능한 날짜를 선택해주세요
      </h2>

      {/* Tip 박스 (하늘색, 라운드, 보더 없음) */}
      <div className="w-full bg-[#cce2fc] rounded-[13px] px-4 py-[13px]">
        <p className="font-normal text-black text-base tracking-[0.50px] leading-6">
          💡&nbsp;&nbsp;Tip : 날짜를 클릭하거나 드래그하여 여러 날짜를 선택할 수
          있어요
        </p>
      </div>

      {/* 카드(하얀 배경, 라운드, 그림자) */}
      <div className="w-full bg-white rounded-[18px] border border-[#eaeaea] shadow-[0px_4px_32px_#aaaaaa08]">
        <div className="flex flex-col gap-6 px-[25px] py-8">
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
                <ChevronLeft className="w-5 h-5 text-[#1c1c1c]" />
              </button>
              <button
                onClick={nextMonth}
                className="w-7 h-7 grid place-items-center hover:opacity-70"
                aria-label="다음 달"
                type="button"
              >
                <ChevronRight className="w-5 h-5 text-[#1c1c1c]" />
              </button>
            </div>
          </header>

          {/* 실제 날짜 그리드: 네 Calendar(드래그/페인트) 사용 */}
          <div className="flex flex-col gap-[11px]">
            <Calendar
              year={year}
              month={month}
              initialSelected={currentSelectedDays} // ★ 아래 “Calendar 패치” 참고
              onSelect={handleSelect} // Date[]를 올려보내도록 유지
              // apiDays={{ 7: { disabled: true } }}  // 필요 시 예시
            />
          </div>
        </div>
      </div>

      {/* 하단 선택 개수/CTA */}
      <p className="flex items-center w-full text-base leading-normal">
        <span className="text-black">선택된 날짜</span>
        <span className="text-[#31689f]">
          &nbsp;&nbsp;&nbsp;&nbsp;{totalSelectedDaysCount}개의 날짜
        </span>
      </p>

      <Button
        variant="primary"
        size="lg"
        style={{ width: "100%" }}
        onClick={handleSubmit}
      >
        선택 완료
      </Button>
    </section>
  );
};
