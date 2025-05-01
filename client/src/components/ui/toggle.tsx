import * as React from "react";
import { cn } from "@/lib/utils";

export interface ToggleSwitchProps extends React.HTMLAttributes<HTMLDivElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function ToggleSwitch({
  checked = false,
  onCheckedChange,
  className,
  ...props
}: ToggleSwitchProps) {
  const handleToggle = () => {
    onCheckedChange?.(!checked);
  };

  return (
    <div
      className={cn(
        "relative inline-block w-10 mr-2 align-middle select-none cursor-pointer",
        className
      )}
      onClick={handleToggle}
      {...props}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={() => {}}
      />
      <div
        className={cn(
          "block w-10 h-5 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-gray-300"
        )}
      />
      <div
        className={cn(
          "absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </div>
  );
}
