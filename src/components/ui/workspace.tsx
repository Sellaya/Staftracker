import type { LucideIcon } from "lucide-react";
import { Loader2, Search } from "lucide-react";
import type { ReactNode } from "react";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-primary/80">
            {eyebrow}
          </p>
        )}
        <h1 className="truncate text-2xl font-medium tracking-tight text-foreground md:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm font-normal leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function WorkspaceCard({
  children,
  className,
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}) {
  const paddingClass = padding === "none" ? "" : padding === "sm" ? "p-3" : padding === "lg" ? "p-5 md:p-6" : "p-4";
  return <section className={cn("workspace-card", paddingClass, className)}>{children}</section>;
}

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon?: LucideIcon;
  tone?: "blue" | "green" | "amber" | "red" | "purple" | "gray";
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-600 bg-emerald-500/10"
      : tone === "amber"
        ? "text-amber-600 bg-amber-500/10"
        : tone === "red"
          ? "text-red-600 bg-red-500/10"
          : tone === "purple"
            ? "text-violet-600 bg-violet-500/10"
            : tone === "gray"
              ? "text-slate-600 bg-slate-500/10"
              : "text-primary bg-primary/10";
  return (
    <div className="metric-card p-4 pl-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-medium tracking-tight text-foreground tabular-nums">{value}</p>
        </div>
        {Icon && (
          <div className={cn("rounded-lg p-2", toneClass)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      {helper && <p className="mt-2 text-xs font-normal text-muted-foreground">{helper}</p>}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm font-medium outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
      />
    </div>
  );
}

export function FilterBar({
  filters,
  active,
  onChange,
  className,
}: {
  filters: string[];
  active: string;
  onChange: (filter: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("mobile-command-scroll flex gap-1.5 overflow-x-auto", className)}>
      {filters.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onChange(filter)}
          className={cn(
            "whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
            active === filter
              ? "border-primary bg-primary text-white"
              : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/35 px-4 py-10 text-center">
      {Icon && (
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-card text-primary">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm font-medium leading-6 text-muted-foreground">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-normal text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        {label}
      </div>
    </div>
  );
}

export function Notice({
  tone = "blue",
  title,
  children,
}: {
  tone?: "blue" | "green" | "amber" | "red" | "gray";
  title?: string;
  children: ReactNode;
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-800"
      : tone === "amber"
        ? "border-amber-500/25 bg-amber-500/10 text-amber-800"
        : tone === "red"
          ? "border-red-500/25 bg-red-500/10 text-red-800"
          : tone === "gray"
            ? "border-border bg-muted text-muted-foreground"
            : "border-primary/20 bg-primary/10 text-blue-900";
  return (
    <div className={cn("rounded-xl border px-3 py-2 text-sm font-medium", toneClass)}>
      {title && <p className="mb-1 font-medium">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

export function FormField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs font-medium text-muted-foreground">{hint}</span>}
    </label>
  );
}

export { ActionMenu, ActionMenuItem } from "./action-menu";
export { ActivityTimeline, type ActivityItem } from "./activity-timeline";
export { DataTable, DataTableBody, DataTableHead } from "./data-table";
export { MobileCardList, MobileCardRow } from "./mobile-card-list";
export { ProfileIdentityCard } from "./profile-identity-card";
export { WorkspaceDialog } from "./workspace-dialog";
export { TabPanel, WorkspaceTabs } from "./workspace-tabs";

