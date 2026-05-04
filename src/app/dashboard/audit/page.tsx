"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ShieldCheck } from "lucide-react";
import { EmptyState, FilterBar, LoadingState, PageHeader, SearchInput, WorkspaceCard } from "@/components/ui/workspace";
import { StatusBadge } from "@/components/ui/status-badge";

type AuditLog = {
  id: string;
  action: string;
  details: string;
  userEmail: string;
  userId: string;
  timestamp: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function actionTone(action: string) {
  if (action.includes("DELETE") || action.includes("REJECT") || action.includes("FLAG")) return "red";
  if (action.includes("APPROVE") || action.includes("PAID") || action.includes("CHECK_OUT")) return "green";
  if (action.includes("CREATE") || action.includes("ASSIGN") || action.includes("GENERATE")) return "blue";
  return "gray";
}

export default function AuditLogsPage() {
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<"allowed" | "denied">("allowed");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const load = async () => {
      const meRes = await fetch("/api/me", { cache: "no-store" });
      const me = meRes.ok ? await meRes.json() : null;
      if (me?.role !== "admin" && me?.role !== "super_admin") {
        setAccess("denied");
        return;
      }
      const res = await fetch("/api/audit", { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      setLogs(Array.isArray(data) ? data : []);
    };
    load().finally(() => setLoading(false));
  }, []);

  const filters = useMemo(() => {
    const groups = new Set<string>(["All"]);
    logs.forEach((log) => {
      if (log.action.includes("CREATE")) groups.add("Create");
      else if (log.action.includes("UPDATE")) groups.add("Update");
      else if (log.action.includes("DELETE")) groups.add("Delete");
      else if (log.action.includes("APPROVE")) groups.add("Approval");
      else if (log.action.includes("ASSIGN")) groups.add("Assignment");
      else groups.add("Other");
    });
    return Array.from(groups);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const text = `${log.action} ${log.details} ${log.userEmail}`.toLowerCase();
      if (!text.includes(searchQuery.toLowerCase())) return false;
      if (filter === "All") return true;
      if (filter === "Create") return log.action.includes("CREATE");
      if (filter === "Update") return log.action.includes("UPDATE");
      if (filter === "Delete") return log.action.includes("DELETE");
      if (filter === "Approval") return log.action.includes("APPROVE");
      if (filter === "Assignment") return log.action.includes("ASSIGN");
      return true;
    });
  }, [filter, logs, searchQuery]);

  if (loading) return <LoadingState label="Loading audit logs" />;

  if (access === "denied") {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Admin access required"
        description="Audit logs are only visible to admins and super admins."
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
      <PageHeader
        eyebrow="Admin audit"
        title="Audit Logs"
        description="Track major MVP operations including jobs, assignments, worker approvals, timesheets, payments, invoices, users, and settings activity."
      />

      <WorkspaceCard padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border bg-muted/45 p-3 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search action, details, or user..." className="lg:max-w-md" />
          <FilterBar filters={filters} active={filter} onChange={setFilter} />
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Activity} title="No audit activity found" description="Actions will appear here after users operate the MVP workflows." />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredLogs.map((log) => (
              <div key={log.id} className="grid gap-3 p-4 md:grid-cols-[180px_1fr_220px] md:items-center">
                <div>
                  <StatusBadge status={actionTone(log.action)} label={log.action.replaceAll("_", " ")} />
                  <p className="mt-2 text-xs font-medium text-muted-foreground">{formatDate(log.timestamp)}</p>
                </div>
                <div>
                  <p className="font-medium leading-6">{log.details}</p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">Log ID: {log.id}</p>
                </div>
                <div className="md:text-right">
                  <p className="text-sm font-medium">{log.userEmail || "System"}</p>
                  <p className="text-xs font-medium text-muted-foreground">{log.userId || "—"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </WorkspaceCard>
    </div>
  );
}

