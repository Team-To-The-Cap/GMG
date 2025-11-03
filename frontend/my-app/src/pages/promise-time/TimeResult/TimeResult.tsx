import type { JSX } from "react";
import { CalendarDisplaySection } from "./CalendarDisplaySection/CalendarDisplaySection";

export const TimeResult = (): JSX.Element => {
  return (
    <div
      className="bg-white overflow-hidden w-full min-w-[393px] min-h-[852px] flex flex-col"
      data-model-id="76:1036"
    >
      <CalendarDisplaySection />
    </div>
  );
};