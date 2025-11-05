import type { JSX } from "react";
import { CalendarDisplaySection } from "./CalendarDisplaySection";
import TopBar from "@/components/ui/top-bar";
import { useNavigate } from "react-router-dom";

export const Time = (): JSX.Element => {
  const navigate = useNavigate();

  const handleBack = () => {
    // 이전 페이지로 이동
    navigate(-1); 
  };
  
  return (
    <>
    <TopBar  title={`일정 입력하기`} showBack={true} onBack={handleBack}/>
    <div className="flex flex-col w-full bg-white" data-model-id="76:817">
      <CalendarDisplaySection />
    </div>
    </>
  );
};
