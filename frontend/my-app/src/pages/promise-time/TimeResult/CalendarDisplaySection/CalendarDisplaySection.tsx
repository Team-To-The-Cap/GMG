import { CheckSquare, ChevronLeftIcon, ChevronRightIcon, Square } from "lucide-react";
import { useMemo, type JSX } from "react";
import Button from "@/components/ui/button";
import { Calendar } from "@/components/ui/Calendar"; 
import { useState } from "react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const fullAvailability: Record<string, number> = {
  "2025-10-11": 5,
  "2025-10-12": 4,
  "2025-10-14": 3,
  "2025-10-15": 3,
  "2025-10-22": 3,
  "2025-10-27": 1,
  "2025-10-28": 2,
  "2025-10-29": 2,
  "2025-10-30": 4, 
  "2025-10-31": 5, 
  "2025-11-05": 5,
  "2025-11-10": 4,
};

// 🚨 사용자가 클릭한 날짜에 표시될 세부 정보 (목업 데이터)
// 실제로는 clickedDay에 따라 API를 통해 이 데이터를 동적으로 가져와야 합니다.
const initialDateSelections = [
  {
    date: "2025. 10. 31", // 클릭 예시 날짜
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
    date: "2025. 10. 30", // 다른 클릭 예시 날짜
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
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(9);

  const [clickedDay, setClickedDay] = useState<number | null>(null);
  const [selections, setSelections] = useState(initialDateSelections);

  const ymKey = useMemo(
    () => `${year}-${String(month + 1).padStart(2, "0")}`,
    [year, month]
  );

  // 현재 달력에 표시할 수 있는 날짜별 인원 수 필터링 (day number만 사용)
  const currentMonthAvailability = useMemo(() => {
    const currentMonthData: Record<number, number> = {};

    for (const fullDate in fullAvailability) {
      if (fullDate.startsWith(ymKey)) {
        const dayPart = fullDate.substring(8); // 'DD' 부분
        const day = parseInt(dayPart, 10);
        currentMonthData[day] = fullAvailability[fullDate];
      }
    }
    return currentMonthData;
  }, [ymKey]);
  
  // maxAvailability는 참여자 수(5명)로 상수로 유지합니다.
  const maxAvailability = 5;
  
  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  // Calendar에서 날짜를 클릭했을 때 호출되는 핸들러
  const handleDayClick = (day: number) => {
    console.log("✅ Clicked:", day);
    // 해당 날짜가 현재 월에 가능 인원이 있는 날짜인지 확인
    if (currentMonthAvailability[day] == null) {
      setClickedDay(null);
      return;
    }
    // 캘린더에서 클릭한 날짜를 설정합니다. (같은 날짜 재클릭 시 닫기)
    setClickedDay(prev => (prev === day ? null : day));
  };

  // 사용자가 세부 정보 바의 체크박스를 클릭했을 때 실행
  const toggleSelection = (index: number) => {
    setSelections(prevSelections => 
      prevSelections.map((item, idx) => 
        idx === index ? { ...item, isSelected: !item.isSelected } : item
      )
    );
  };

  // 캘린더에서 클릭된 날짜에 해당하는 항목만 필터링
  const filteredSelections = useMemo(() => {
    if (clickedDay === null) return [];
    
    // YYYY. MM. DD 형식으로 현재 클릭된 날짜 문자열 생성 (목업 데이터 형식과 일치)
    const dateString = `${year}. ${String(month + 1).padStart(2, "0")}. ${String(clickedDay).padStart(2, "0")}`;

    // ★ Mockup 데이터 필터링: 실제 구현 시에는 이 날짜에 대한 API 응답을 기다려야 합니다.
    // 여기서는 목업 데이터가 clickedDay와 일치하는지 확인합니다.
    return selections.filter(item => item.date === dateString);
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
      
                {/* 실제 날짜 그리드: 네 Calendar(드래그/페인트) 사용 */}
                <div className="flex flex-col gap-[11px]">
                  <Calendar
                    year={year}
                    month={month}
                    interactive={false}
                    availability={currentMonthAvailability}
                    maxAvailability={maxAvailability}
                    onDayClick={handleDayClick}
                    // apiDays={{ 7: { disabled: true } }}  // 필요 시 예시
                  />
                </div>
              </div>
            </div>

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

      {/* 3. [조건부 렌더링] 날짜 세부 정보 바 (클릭된 날짜가 있고, 필터링된 항목이 있을 때만 표시) */}
      {filteredSelections.length > 0 && (
        <div className="w-full flex flex-col gap-2.5 items-center">
          {filteredSelections.map((selection, index) => (
            <div
              key={`selection-${index}`}
              className={`w-full h-[51px] bg-white rounded-[13px] overflow-hidden border-2 border-solid ${selection.borderColor} flex items-center justify-between px-4 cursor-pointer`}
              // selections 배열의 index를 찾아 토글합니다. (목업 데이터에서 안정성을 위해 findIndex 사용)
              onClick={() => toggleSelection(initialDateSelections.findIndex(item => item.date === selection.date))}
            >
              <span className="font-['Inria_Sans',Helvetica] font-normal text-black text-xl text-center tracking-[0.50px] leading-6 whitespace-nowrap">
                {selection.date}
              </span>

              <div className="flex items-center gap-2.5">
                {/* 아바타 그룹 */}
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
                  <CheckSquare className="w-6 h-6 text-[#3E93FA]" />   // 파란 체크박스
                  ) : (
                  <Square className="w-6 h-6 text-[#BDBDBD]" />       // 회색 빈 박스
                  )}
                
              </div>
            </div>
          ))}
        </div>
      )}

      <Button variant="primary" size="lg"  style={{ width: "100%" }}>
        선택 완료
      </Button>
    </section>
  );
};
