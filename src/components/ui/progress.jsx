import React from "react";
import { cn } from "@/lib/utils";

export function Progress({ value = 0, className, ...props }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)} {...props}>
      <div className="h-full bg-primary transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}
