import React, { createContext, useContext, useMemo } from "react";
import { cn } from "@/lib/utils";

const SelectContext = createContext(null);

function collectItems(children, items) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === SelectItem) {
      items.push({ value: child.props.value, label: child.props.children });
      return;
    }
    if (child.props?.children) {
      collectItems(child.props.children, items);
    }
  });
}

export function Select({ value, onValueChange, children }) {
  const items = useMemo(() => {
    const found = [];
    collectItems(children, found);
    return found;
  }, [children]);

  const contextValue = useMemo(
    () => ({ value, onValueChange, items }),
    [value, onValueChange, items]
  );

  return <SelectContext.Provider value={contextValue}>{children}</SelectContext.Provider>;
}

export function SelectTrigger({ className, ...props }) {
  const context = useContext(SelectContext);
  if (!context) return null;
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      value={context.value}
      onChange={(event) => context.onValueChange?.(event.target.value)}
      {...props}
    >
      {context.items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

export function SelectContent() {
  return null;
}

export function SelectItem() {
  return null;
}

export function SelectValue() {
  return null;
}
