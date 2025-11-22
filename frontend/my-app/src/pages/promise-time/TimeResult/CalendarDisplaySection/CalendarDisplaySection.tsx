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

export const CalendarDisplaySection = (): JSX.Element => {
  const { promiseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const prevState = (location.state as any) ?? {};

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(() => today.getFullYear());
  const [month, setMonth] = useState(() => today.getMonth());

  const [clickedDay, setClickedDay] = useState<number | null>(null);

  const [participants, setParticipants] = useState<any[]>([]);
  const participantCount = participants.length;

  // ---- Fetch participants ----
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

  // ---- Fetch meeting plan ----
  const [meetingPlan, setMeetingPlan] = useState<any>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      const res = await fetch(
        `http://223.130.152.114:8001/meetings/${promiseId}`
      );
      const data = await res.json();
      setMeetingPlan(data.plan);
    };

    fetchPlan();
  }, [promiseId]);

  // ---- Build availability map for calendar ----
  const currentMonthAvailability = useMemo(() => {
    if (!meetingPlan) return {};

    const result: Record<number, number> = {};

    meetingPlan.available_dates.forEach((d: any) => {
      const dt = new Date(d.date);
      if (Number.isNaN(dt.getTime())) return;

      const y = dt.getFullYear();
      const m = dt.getMonth();
      const day = dt.getDate();

      if (y === year && m === month) {
        result[day] =
          typeof d.available_participant_number === "number"
            ? d.available_participant_number
            : 0;
      }
    });

    return result;
  }, [meetingPlan, year, month]);

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
    if (currentMonthAvailability[day] == null) {
      setClickedDay(null);
      return;
    }
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

  // ---- Find who is available on selected date ----
  const availableParticipantsForDay = useMemo(() => {
    if (!meetingPlan || !selectedDateISO) return [];

    const record = meetingPlan.available_dates.find(
      (d: any) => d.date === selectedDateISO
    );

    if (!record || !record.available_participant) return [];

    const idSet = new Set(record.available_participant);
    return participants.filter((p) => idSet.has(p.id));
  }, [meetingPlan, selectedDateISO, participants]);

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
