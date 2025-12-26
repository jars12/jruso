import React from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ checked = false, onCheckedChange, className, ...props }) {
  return (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      className={cn("h-4 w-4 rounded border border-input text-primary", className)}
      {...props}
    />
  );
}
