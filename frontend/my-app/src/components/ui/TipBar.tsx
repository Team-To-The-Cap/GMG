import { type JSX } from "react";

interface TipBarProps {
  message: string;
}

export const TipBar = ({ message }: TipBarProps): JSX.Element => {
  return (
    <div className="w-full bg-[#cce2fc] rounded-[13px] p-4 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
      <p className="[font-family:'Asul',Helvetica] font-normal text-black text-base tracking-[0.50px] leading-6">
        💡&nbsp;&nbsp;Tip : {message}
      </p>
    </div>
  );
};
