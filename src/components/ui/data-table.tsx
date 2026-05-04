import type { ReactNode } from "react";
import { cn } from "./workspace";

export function DataTable({
  children,
  className,
  wrapperClassName,
}: {
  children: ReactNode;
  className?: string;
  /** Outer scroll + border wrapper */
  wrapperClassName?: string;
}) {
  return (
    <div className={cn("workspace-card overflow-hidden p-0", wrapperClassName)}>
      <div className="overflow-x-auto">
        <table className={cn("w-full min-w-[640px] text-left text-sm", className)}>{children}</table>
      </div>
    </div>
  );
}

export function DataTableHead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <thead className={cn("border-b border-border bg-muted/50 text-[11px] font-medium uppercase tracking-wide text-muted-foreground", className)}>
      {children}
    </thead>
  );
}

export function DataTableBody({ children, className }: { children: ReactNode; className?: string }) {
  return <tbody className={cn("divide-y divide-border bg-card", className)}>{children}</tbody>;
}
