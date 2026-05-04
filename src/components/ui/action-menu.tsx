"use client";

import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./workspace";

export function ActionMenu({
  children,
  align = "right",
  className,
}: {
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <details className={cn("group relative", className)}>
      <summary className="list-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </span>
      </summary>
      <div
        className={cn(
          "absolute z-40 mt-1 min-w-[10rem] rounded-xl border border-border bg-card p-1 shadow-lg",
          align === "right" ? "right-0" : "left-0",
        )}
        onClick={(e) => {
          const el = (e.currentTarget as HTMLElement).closest("details");
          if (el) el.open = false;
        }}
      >
        {children}
      </div>
    </details>
  );
}

export function ActionMenuItem({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors",
        danger ? "text-red-600 hover:bg-red-500/10" : "text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
