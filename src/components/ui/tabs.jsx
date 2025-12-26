import React, { createContext, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const TabsContext = createContext(null);

export function Tabs({ defaultValue, value, onValueChange, className, children }) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = value ?? internalValue;
  const setValue = onValueChange ?? setInternalValue;

  const contextValue = useMemo(
    () => ({ value: currentValue, setValue }),
    [currentValue, setValue]
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }) {
  return (
    <div className={cn("inline-flex items-center rounded-lg bg-muted p-1", className)} {...props} />
  );
}

export function TabsTrigger({ value, className, ...props }) {
  const context = useContext(TabsContext);
  if (!context) return null;
  const isActive = context.value === value;
  return (
    <button
      type="button"
      onClick={() => context.setValue(value)}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        isActive ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
        className
      )}
      data-state={isActive ? "active" : "inactive"}
      {...props}
    />
  );
}

export function TabsContent({ value, className, ...props }) {
  const context = useContext(TabsContext);
  if (!context || context.value !== value) return null;
  return <div className={cn("pt-4", className)} {...props} />;
}
