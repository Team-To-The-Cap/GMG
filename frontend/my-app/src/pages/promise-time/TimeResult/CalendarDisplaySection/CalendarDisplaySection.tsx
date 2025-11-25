// src/pages/.../CalendarDisplaySection.tsx
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useMemo, useState, type JSX } from "react";
import Button from "@/components/ui/button";
import { Calendar } from "@/components/ui/Calendar";
import { useNavigate, useParams } from "react-router-dom";

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

type ParticipantTime = {
  start_time: string;
  end_time: string;
  id: number;
};

type Participant = {
  id: number;
  name: string;
  available_times: ParticipantTime[];
};

// type MeetingPlan = {
//   id: number;
//   meeting_time: string | null;
//   // 필요한 필드만 적당히...
// };

export const CalendarDisplaySection = (): JSX.Element => {
  const { promiseId } = useParams();
  const navigate = useNavigate();

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(() => today.getFullYear());
  const [month, setMonth] = useState(() => today.getMonth());

  const [clickedDay, setClickedDay] = useState<number | null>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const participantCount = participants.length;

  // ---- Fetch participants ----
  useEffect(() => {
    const fetchParticipants = async () => {
      if (!promiseId) return;

      const res = await fetch(
        `http://223.130.152.114:8001/meetings/${promiseId}/participants`
      );
      const data = await res.json();
      console.log("participants:", data);
      setParticipants(data);
    };

    fetchParticipants();
  }, [promiseId]);

  // ---- Fetch meeting detail (plan 정보 등 필요할 때) ----
  //   useEffect(() => {
  //     const fetchPlan = async () => {
  //       if (!promiseId) return;

  //       const res = await fetch(
  //         `http://223.130.152.114:8001/meetings/${promiseId}`
  //       );
  //       //   const data: MeetingDetailResponse = await res.json();

  //       //   setMeetingPlan(data.plan ?? null);
  //     };

  //     fetchPlan();
  //   }, [promiseId]);

  // ---- participants 기반으로 날짜 → 참가자 ID 목록 맵 구성 ----
  const dateToParticipantIds = useMemo(() => {
    const map: Record<string, number[]> = {};

    for (const p of participants) {
      const times = p.available_times ?? [];
      for (const t of times) {
        const start = new Date(t.start_time);
        const end = new Date(t.end_time);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          continue;
        }

        // 날짜 단위로 풀어쓰기
        let d = new Date(
          start.getFullYear(),
          start.getMonth(),
          start.getDate()
        );
        const endD = new Date(end.getFullYear(), end.getMonth(), end.getDate());

        while (d <= endD) {
          const iso = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
          if (!map[iso]) {
            map[iso] = [];
          }
          if (!map[iso].includes(p.id)) {
            map[iso].push(p.id);
          }

          d.setDate(d.getDate() + 1);
        }
      }
    }

    console.log("dateToParticipantIds:", map);
    return map;
  }, [participants]);

  // ---- Build availability map for calendar (현재 month/year만) ----
  const currentMonthAvailability = useMemo(() => {
    const result: Record<number, number> = {};

    Object.entries(dateToParticipantIds).forEach(([iso, ids]) => {
      const [yStr, mStr, dStr] = iso.split("-");
      const y = Number(yStr);
      const m = Number(mStr) - 1; // JS month 0–11
      const day = Number(dStr);

      if (y === year && m === month) {
        result[day] = ids.length; // 해당 날짜에 가능한 참가자 수
      }
    });

    console.log("currentMonthAvailability:", result);
    return result;
  }, [dateToParticipantIds, year, month]);

  // ---- maxAvailability: 전체 참가자 수 기준 ----
  const maxAvailability = useMemo(() => {
    // 기본적으로 전체 참가자 수
    let base = participantCount;

    // 혹시 participants가 아직 안 들어왔어도,
    // dateToParticipantIds에서 최대값을 하나 더 보정할 수 있음
    const maxFromMap = Object.values(dateToParticipantIds).reduce(
      (max, ids) => (ids.length > max ? ids.length : max),
      0
    );

    if (maxFromMap > base) base = maxFromMap;

    console.log(
      "participantCount =",
      participantCount,
      "maxAvailability =",
      base
    );
    return base;
  }, [participantCount, dateToParticipantIds]);

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
    // 이 달력에서 색칠된 날(= map에 있는 날)만 클릭 가능
    // if (currentMonthAvailability[day] == null) {
    //   setClickedDay(null);
    //   return;
    // }
    setClickedDay((prev) => (prev === day ? null : day));
  };

  // ---- Format selected date ----
  const selectedDateISO = useMemo(() => {
    if (clickedDay === null) return null;
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(
      clickedDay
    ).padStart(2, "0")}`;
  }, [year, month, clickedDay]);

  const selectedDateDisplay = useMemo(() => {
    if (clickedDay === null) return null;
    return `${year}. ${String(month + 1).padStart(2, "0")}. ${String(
      clickedDay
    ).padStart(2, "0")}`;
  }, [year, month, clickedDay]);

  // ---- Find who is available on selected date (participants + dateToParticipantIds) ----
  const availableParticipantsForDay = useMemo(() => {
    if (!selectedDateISO) return [];

    const ids = dateToParticipantIds[selectedDateISO] ?? [];
    const idSet = new Set(ids);
    return participants.filter((p) => idSet.has(p.id));
  }, [dateToParticipantIds, selectedDateISO, participants]);

  // ---- Save selected date ----
  const handleConfirm = () => {
    if (!selectedDateISO || !selectedDateDisplay) {
      alert("날짜를 먼저 선택해주세요.");
      return;
    }

    navigate(`/details/${promiseId}`, {
      replace: true,
      state: {
        finalDate: selectedDateISO,
        finalDateDisplay: selectedDateDisplay,
      },
    });
  };

  return (
    <section className="flex z-1 w-full relative flex-col items-end gap-[17px] pt-[17px] pb-[13px] px-5 bg-[#f7f7f7]">
      <h2 className="w-full font-bold text-black text-xl">일정 조율 결과</h2>

      {/* Calendar Box */}
      <div className="w-full bg-white rounded-[18px] border border-[#eaeaea] shadow">
        <div className="flex flex-col gap-6 px-[25px] py-[30px]">
          <header className="flex items-center justify-between w-full">
            <h3 className="font-bold text-xl text-[#1c1c1c]">
              {MONTHS[month]} {year}
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth}>
                <ChevronLeftIcon />
              </button>
              <button onClick={nextMonth}>
                <ChevronRightIcon />
              </button>
            </div>
          </header>

          <div>
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

      {/* Legend */}
      <div className="flex items-center gap-6">
        <span className="flex items-center gap-2">
          <div className="w-5 h-5 bg-[#3e93fa] rounded-xl"></div> 모두 가능
        </span>
        <span className="flex items-center gap-2">
          <div className="w-5 h-5 bg-[#cce2fc] rounded-xl"></div> 일부 가능
        </span>
      </div>

      {/* Clicked date details */}
      {clickedDay && availableParticipantsForDay.length > 0 && (
        <div className="w-full bg-white rounded-xl p-4 shadow border border-gray-200">
          <div className="flex justify-between">
            <span className="text-lg font-semibold">{selectedDateDisplay}</span>
            <span className="text-blue-500 font-semibold">
              {availableParticipantsForDay.length}명 가능
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {availableParticipantsForDay.map((p) => (
              <span
                key={p.id}
                className="px-3 py-1 bg-gray-100 rounded-full text-sm"
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        style={{ width: "100%" }}
        onClick={handleConfirm}
      >
        선택 완료
      </Button>
    </section>
  );
};
