import React, { createContext, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const DialogContext = createContext(null);

export function Dialog({ open, onOpenChange, children }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const setOpen = (value) => {
    if (!isControlled) {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  };

  const contextValue = useMemo(() => ({ open: isOpen, setOpen }), [isOpen]);

  return <DialogContext.Provider value={contextValue}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({ asChild = false, children, ...props }) {
  const context = useContext(DialogContext);
  if (!context) return null;

  const handleClick = (event) => {
    if (children.props?.onClick) {
      children.props.onClick(event);
    }
    context.setOpen(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: handleClick,
    });
  }

  return (
    <button type="button" onClick={() => context.setOpen(true)} {...props}>
      {children}
    </button>
  );
}

export function DialogContent({ className, children, ...props }) {
  const context = useContext(DialogContext);
  if (!context?.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={cn("w-full max-w-lg rounded-2xl bg-background p-6 shadow-lg", className)} {...props}>
        {children}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="text-xs text-muted-foreground"
            onClick={() => context.setOpen(false)}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn("mb-4 space-y-1", className)} {...props} />;
}

export function DialogTitle({ className, ...props }) {
  return <h2 className={cn("text-lg font-semibold", className)} {...props} />;
}
