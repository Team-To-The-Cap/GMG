import type { JSX } from "react";
import { CalendarDisplaySection } from "./CalendarDisplaySection/CalendarDisplaySection";
import TopBar from "@/components/ui/top-bar";
import { useNavigate } from "react-router-dom";

export const TimeResult = (): JSX.Element => {
  const navigate = useNavigate();

  const handleBack = () => {
    // 이전 페이지로 이동
    navigate(-1);
  };

  return (
    <>
      <div>
        <CalendarDisplaySection />
      </div>
    </>
  );
};
