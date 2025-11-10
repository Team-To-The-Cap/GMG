import type { JSX } from "react";
import { CalendarDisplaySection } from "./CalendarDisplaySection";
import { useNavigate } from "react-router-dom";

export const Time = (): JSX.Element => {
  const navigate = useNavigate();

  const handleBack = () => {
    // 이전 페이지로 이동
    navigate(-1);
  };

  return (
    <>
      <div className="flex flex-col w-full bg-white" data-model-id="76:817">
        <CalendarDisplaySection />
      </div>
    </>
  );
};
