import { cn } from "./workspace";

export type BadgeDomain =
  | "auto"
  | "job"
  | "applicant"
  | "worker"
  | "document"
  | "shift"
  | "timesheet"
  | "payment"
  | "invoice";

type StatusTone = "blue" | "green" | "amber" | "red" | "gray" | "purple";

function humanize(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace("By", "by");
}

function toneClassFor(tone: StatusTone): string {
  const map: Record<StatusTone, string> = {
    green: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-700",
    red: "border-red-500/25 bg-red-500/10 text-red-700",
    purple: "border-violet-500/25 bg-violet-500/10 text-violet-700",
    blue: "border-blue-500/25 bg-blue-500/10 text-blue-700",
    gray: "border-border bg-muted text-muted-foreground",
  };
  return map[tone];
}

function resolveDomain(domain: BadgeDomain, raw: string): { tone: StatusTone; label: string } {
  const s = raw.trim();
  const lower = s.toLowerCase();

  switch (domain) {
    case "job": {
      if (lower === "open") return { tone: "blue", label: "Open" };
      if (lower === "filled") return { tone: "green", label: "Filled" };
      if (lower === "cancelled" || lower === "canceled") return { tone: "red", label: "Cancelled" };
      break;
    }
    case "applicant": {
      if (lower === "pending_admin") return { tone: "amber", label: "Pending review" };
      if (lower === "confirmed") return { tone: "green", label: "Confirmed" };
      if (lower === "rejected") return { tone: "red", label: "Rejected" };
      if (lower === "withdrawn") return { tone: "gray", label: "Withdrawn" };
      break;
    }
    case "worker": {
      if (lower === "pending") return { tone: "amber", label: "Pending" };
      if (lower === "active") return { tone: "green", label: "Active" };
      if (lower === "suspended") return { tone: "amber", label: "Suspended" };
      if (lower === "rejected") return { tone: "red", label: "Rejected" };
      break;
    }
    case "document": {
      if (lower === "pending") return { tone: "amber", label: "Pending" };
      if (lower === "approved") return { tone: "green", label: "Approved" };
      if (lower === "rejected") return { tone: "red", label: "Rejected" };
      break;
    }
    case "shift": {
      if (lower === "upcoming") return { tone: "blue", label: "Upcoming" };
      if (lower === "active") return { tone: "blue", label: "Active" };
      if (lower === "completed") return { tone: "green", label: "Completed" };
      if (lower === "cancelled" || lower === "canceled") return { tone: "red", label: "Cancelled" };
      break;
    }
    case "timesheet": {
      if (lower === "pending_client_approval") return { tone: "amber", label: "Pending client approval" };
      if (lower === "approved_by_client") return { tone: "green", label: "Approved by client" };
      if (lower === "approved_by_admin") return { tone: "green", label: "Approved by admin" };
      if (lower === "issue_flagged") return { tone: "red", label: "Issue flagged" };
      if (lower === "rejected_by_admin") return { tone: "red", label: "Rejected by admin" };
      break;
    }
    case "payment": {
      if (lower === "pending") return { tone: "amber", label: "Pending" };
      if (lower === "finalized") return { tone: "amber", label: "Finalized" };
      if (lower === "paid") return { tone: "green", label: "Paid" };
      break;
    }
    case "invoice": {
      if (lower === "pending") return { tone: "amber", label: "Pending" };
      if (lower === "invoiced") return { tone: "green", label: "Invoiced" };
      break;
    }
    default:
      break;
  }

  return { tone: autoToneFromValue(s), label: humanize(s || "Unknown") };
}

function autoToneFromValue(status: string): StatusTone {
  const value = status.toLowerCase().replace(/\s+/g, "_");
  if (["green", "success"].includes(value)) return "green";
  if (["amber", "warning"].includes(value)) return "amber";
  if (["red", "danger"].includes(value)) return "red";
  if (["blue", "info"].includes(value)) return "blue";
  if (["purple"].includes(value)) return "purple";
  if (["gray", "grey", "neutral"].includes(value)) return "gray";
  if (
    [
      "approved",
      "active",
      "paid",
      "completed",
      "filled",
      "confirmed",
      "approved_by_client",
      "approved_by_admin",
      "invoiced",
    ].includes(value)
  ) {
    return "green";
  }
  if (["open", "upcoming"].includes(value)) return "blue";
  if (
    [
      "pending",
      "pending_admin",
      "pending_client_approval",
      "finalized",
      "pending_payment",
    ].includes(value)
  ) {
    return "amber";
  }
  if (
    [
      "rejected",
      "cancelled",
      "canceled",
      "flagged",
      "issue_flagged",
      "rejected_by_admin",
      "suspended",
    ].includes(value)
  ) {
    return "red";
  }
  if (["worker", "admin", "super_admin", "user"].includes(value)) return "purple";
  return "gray";
}

export function StatusBadge({
  status,
  label,
  domain = "auto",
  className,
}: {
  status?: string | null;
  label?: string;
  domain?: BadgeDomain;
  className?: string;
}) {
  const safeStatus = String(status || "").trim() || "unknown";
  let tone: StatusTone;
  let text: string;
  if (domain === "auto") {
    tone = autoToneFromValue(safeStatus);
    text = label ?? humanize(safeStatus);
  } else {
    const d = resolveDomain(domain, safeStatus);
    tone = d.tone;
    text = label ?? d.label;
  }

  const toneClass = toneClassFor(tone);

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-medium leading-none",
        toneClass,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {text}
    </span>
  );
}

export function RoleBadge({ role }: { role?: string | null }) {
  const value = String(role || "user");
  const label =
    value === "super_admin"
      ? "Super admin"
      : value === "admin"
        ? "Admin"
        : value === "worker"
          ? "Worker"
          : "Client";
  return <StatusBadge domain="auto" status={value} label={label} />;
}
