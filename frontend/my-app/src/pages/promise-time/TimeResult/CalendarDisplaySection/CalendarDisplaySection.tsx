import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import React, { type JSX } from "react";
import Button from "@/components/ui/button";
import { Calendar } from "@/components/ui/Calendar"; 
import { useState } from "react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const dateSelections = [
  {
    date: "2025. 10. 31",
    avatars: [
      "https://c.animaapp.com/mhhdoadq80wQwQ/img/shape-3.png",
      "https://c.animaapp.com/mhhdoadq80wQwQ/img/shape-4.png",
      "https://c.animaapp.com/mhhdoadq80wQwQ/img/shape-2.png",
    ],
    extraCount: 1,
    borderColor: "border-[#41a0f4]",
  },
  {
    date: "2025. 10. 31",
    avatars: [
      "https://c.animaapp.com/mhhdoadq80wQwQ/img/shape-3.png",
      "https://c.animaapp.com/mhhdoadq80wQwQ/img/shape-4.png",
    ],
    extraCount: 0,
    borderColor: "border-[#cce2fc]",
  },
];

export const CalendarDisplaySection = (): JSX.Element => {
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(9);

  // 예: API에서 받은 “날짜별 가능 인원 수”
  // 10/11=5명, 10/12=4명, 10/27=1명 ...
  const availability = {
    11: 5,
    12: 4,
    14: 3,
    15: 3,
    22: 3,
    27: 1,
    28: 2,
    29: 2,
  };

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  // 최대치(전원 가능 인원)를 알려주면 스케일 고정
  const maxAvailability = 5; // 참여자 수


  return (
    <section className="flex z-1 mt-[91px] max-w-[393px] mx-auto relative flex-col items-end gap-[17px] pt-[17px] pb-[13px] px-5 bg-[#f7f7f7]">
      <h2 className="w-full font-['Aleo',Helvetica] font-bold text-black text-xl tracking-[0.50px] leading-4 whitespace-nowrap">
        일정 조율 결과
      </h2>

      {/* 카드(하얀 배경, 라운드, 그림자) */}
            <div className="w-full max-w-[352px] bg-white rounded-[18px] border border-[#eaeaea] shadow-[0px_4px_32px_#aaaaaa08]">
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
                    availability={availability}
                    maxAvailability={maxAvailability}
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

      {dateSelections.map((selection, index) => (
        <div
          key={`selection-${index}`}
          className={`w-full h-[51px] bg-white rounded-[13px] overflow-hidden border-2 border-solid ${selection.borderColor} flex items-center justify-between px-4`}
          style={
            {
              "--animation-delay": `${600 + index * 200}ms`,
            } as React.CSSProperties
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
                  className="w-6 h-6 rounded-full bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${avatar})` }}
                />
              ))}
              {selection.extraCount > 0 && (
                <div className="flex flex-col w-6 h-6 items-center justify-center bg-neutral-100 rounded-lg overflow-hidden">
                  <span className="font-m3-label-small font-(--m3-label-small-font-weight) text-[#757575] text-(length:--m3-label-small-font-size) text-center tracking-(--m3-label-small-letter-spacing) leading-(--m3-label-small-line-height) [font-style:var(--m3-label-small-font-style)]">
                    +{selection.extraCount}
                  </span>
                </div>
              )}
            </div>

            <img
              className="w-6 h-6"
              alt="Check box"
              src="https://c.animaapp.com/mhhdoadq80wQwQ/img/check-box.svg"
            />
          </div>
        </div>
      ))}

      <Button variant="primary" size="lg"  style={{ width: "100%" }}>
        선택 완료
      </Button>
    </section>
  );
};
