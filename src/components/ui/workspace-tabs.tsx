"use client";

import type { ReactNode } from "react";
import { cn } from "./workspace";

export function WorkspaceTabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1 overflow-x-auto border-b border-border pb-px md:gap-2", className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "relative shrink-0 whitespace-nowrap px-3 py-2 text-xs font-medium transition-colors md:text-sm",
            active === t.id ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          {active === t.id && (
            <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" aria-hidden />
          )}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ id, active, children }: { id: string; active: string; children: ReactNode }) {
  if (id !== active) return null;
  return <div className="pt-4">{children}</div>;
}
