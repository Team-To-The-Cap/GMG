import * as React from "react";
import clsx from "clsx";
import CardSurface from "./promise-card"; // ★ 팀원 Card (CSS module 기반 그 표면)

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export const Panel = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    // 표면은 팀원 Card를 재사용
    <CardSurface className={className}>
      <div ref={ref} {...props} />
    </CardSurface>
  )
);
Panel.displayName = "Panel";

export const PanelHeader = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("flex flex-col gap-1.5 p-4", className)} {...props} />
  )
);
PanelHeader.displayName = "PanelHeader";

export const PanelTitle = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("font-semibold leading-none", className)} {...props} />
  )
);
PanelTitle.displayName = "PanelTitle";

export const PanelDescription = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("text-sm text-neutral-500", className)} {...props} />
  )
);
PanelDescription.displayName = "PanelDescription";

export const PanelContent = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("p-4 pt-0", className)} {...props} />
  )
);
PanelContent.displayName = "PanelContent";

export const PanelFooter = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("flex items-center p-4 pt-0", className)} {...props} />
  )
);
PanelFooter.displayName = "PanelFooter";