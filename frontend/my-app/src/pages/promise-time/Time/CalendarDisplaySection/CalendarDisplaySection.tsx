import { useMemo, useState, type JSX } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/Calendar";
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

  for (const ymKey in selByMonth) {
    const [yearStr, monthStr] = ymKey.split("-");
    const days = selByMonth[ymKey];

    if (days && days.length > 0) {
      days.forEach((day) => {
        const dayStr = String(day).padStart(2, "0");
        allDates.push(`${yearStr}-${monthStr}-${dayStr}`);
      });
    }
  }
  return allDates.sort();
};

const makeFullDayTimes = (dates: string[]) => {
  return dates.map((date) => ({
    start_time: `${date}T00:00:01Z`,
    end_time: `${date}T23:59:59Z`,
  }));
};

export const CalendarDisplaySection = (): JSX.Element => {
  // ✅ 오늘 날짜 기준으로 초기 year/month 세팅
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(() => today.getFullYear());
  const [month, setMonth] = useState(() => today.getMonth()); // 0-index (11월이면 10)

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

    const segments = location.pathname.split("/");
    const mode = segments[1]; // 'details' 또는 'create'

    navigate(`/${mode}/${promiseId}/participants/new`, {
      state: {
        ...state,
        nameDraft,
        selectedTimes: availableTimes,
      },
    });
  };

  return (
    <section className="flex flex-col items-center justify-center gap-[15px] px-5 py-5 bg-[#f7f7f7]">
      <h2 className="w-full font-semibold text-black text-lg tracking-[0.3px] leading-7">
        가능한 날짜를 선택해주세요
      </h2>

      <div className="w-full bg-[#cce2fc] rounded-[13px] px-4 py-[13px]">
        <p className="font-normal text-black text-base tracking-[0.50px] leading-6">
          💡&nbsp;&nbsp;Tip : 날짜를 클릭하거나 드래그하여 여러 날짜를 선택할 수
          있어요
        </p>
      </div>

      <div className="w-full bg-white rounded-[18px] border border-[#eaeaea] shadow-[0px_4px_32px_#aaaaaa08]">
        <div className="flex flex-col gap-6 px-[25px] py-8">
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

          <div className="flex flex-col gap-[11px]">
            <Calendar
              year={year}
              month={month}
              initialSelected={currentSelectedDays}
              onSelect={handleSelect}
              // apiDays={{ 7: { disabled: true } }}  // 필요 시 예시
            />
          </div>
        </div>
      </div>

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
