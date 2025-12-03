import * as React from "react";
import { cn } from "@/utils/utils";

const Panel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className
    )}
    {...props}
  />
));
Panel.displayName = "Panel"; // Renamed from Card.displayName

const PanelHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
PanelHeader.displayName = "PanelHeader"; // Renamed from CardHeader.displayName

const PanelTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
PanelTitle.displayName = "PanelTitle"; // Renamed from CardTitle.displayName

const PanelDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
PanelDescription.displayName = "PanelDescription"; // Renamed from CardDescription.displayName

const PanelContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
PanelContent.displayName = "PanelContent"; // Renamed from CardContent.displayName

const PanelFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
PanelFooter.displayName = "PanelFooter"; // Renamed from CardFooter.displayName

export {
  Panel, // Renamed export
  PanelHeader, // Renamed export
  PanelFooter, // Renamed export
  PanelTitle, // Renamed export
  PanelDescription, // Renamed export
  PanelContent, // Renamed export
};
