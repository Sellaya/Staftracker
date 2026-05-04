import type { ReactNode } from "react";
import { cn } from "./workspace";

export function MobileCardList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-3 md:hidden", className)}>{children}</div>;
}

export function MobileCardRow({
  title,
  subtitle,
  meta,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("workspace-card flex flex-col gap-2 p-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-foreground">{title}</div>
          {subtitle && <div className="mt-0.5 text-xs font-medium text-muted-foreground">{subtitle}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap justify-end gap-1">{actions}</div>}
      </div>
      {meta && <div className="border-t border-border pt-2 text-xs font-medium text-muted-foreground">{meta}</div>}
    </div>
  );
}
