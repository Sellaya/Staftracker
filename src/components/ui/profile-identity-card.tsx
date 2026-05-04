import { cn } from "./workspace";

export function ProfileIdentityCard({
  name,
  email,
  subtitle,
  initials,
  className,
  size = "md",
  variant = "default",
}: {
  name: string;
  email?: string;
  subtitle?: string;
  initials: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** `sidebar` = dark rail (Staff Tracker primary nav) */
  variant?: "default" | "sidebar";
}) {
  const av =
    size === "lg" ? "h-11 w-11 text-sm" : size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  const isSidebar = variant === "sidebar";
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-xl border p-2.5 shadow-sm",
        isSidebar ? "border-white/10 bg-white/[0.07]" : "border-border bg-card",
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg font-medium text-white",
          isSidebar ? "bg-white text-[#111827]" : "bg-[#111827]",
          av,
        )}
      >
        {initials}
      </div>
      <div className="min-w-0">
        <p className={cn("truncate text-sm font-medium", isSidebar ? "text-white" : "text-foreground")}>{name}</p>
        {subtitle && (
          <p
            className={cn(
              "truncate text-[10px] font-medium uppercase tracking-wide",
              isSidebar ? "text-white/55" : "text-muted-foreground",
            )}
          >
            {subtitle}
          </p>
        )}
        {email && (
          <p className={cn("truncate text-xs", isSidebar ? "text-white/45" : "text-muted-foreground")}>{email}</p>
        )}
      </div>
    </div>
  );
}
