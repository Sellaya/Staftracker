import { cn } from "./workspace";

export type ActivityItem = {
  id: string;
  title: string;
  time: string;
  description?: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
};

const toneBar: Record<NonNullable<ActivityItem["tone"]>, string> = {
  default: "bg-border",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-sky-500",
};

export function ActivityTimeline({ items, className }: { items: ActivityItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={cn("space-y-0", className)}>
      {items.map((item, i) => (
        <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
          {i < items.length - 1 && <span className="absolute left-[5px] top-3 h-full w-px bg-border" aria-hidden />}
          <span className={cn("relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-card", toneBar[item.tone || "default"])} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <time className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{item.time}</time>
            </div>
            {item.description && <p className="mt-0.5 text-xs font-medium leading-relaxed text-muted-foreground">{item.description}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
