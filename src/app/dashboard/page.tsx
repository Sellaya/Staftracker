"use client";

import { motion } from "framer-motion";
import {
  Clock,
  AlertTriangle,
  MapPin,
  Activity,
  Timer,
  Users,
  Building2,
  Briefcase,
  UserCheck,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  ReceiptText,
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ActivityTimeline, type ActivityItem } from "@/components/ui/activity-timeline";
import { EmptyState, LoadingState, MetricCard, PageHeader, WorkspaceCard } from "@/components/ui/workspace";
import { StatusBadge } from "@/components/ui/status-badge";

type AdminKpis = {
  workerCount: number;
  clientCount: number;
  pendingWorkerActivations: number;
  openJobs: number;
  filledJobs: number;
  activeShifts: number;
  completedShifts: number;
  pendingTimesheets: number;
  workersDocPending: number;
  clientsPendingPayment: number;
  approvedUnbilledShifts: number;
  pendingInvoices: number;
};

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState({
    activeHours: "0.0",
    loggedToday: "0",
    scheduled: "0",
    overtimeRisk: "0",
    monthlyRevenue: "0",
  });
  const [adminKpis, setAdminKpis] = useState<AdminKpis | null>(null);
  const [ongoingShifts, setOngoingShifts] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [auditPreview, setAuditPreview] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const asArray = async (res: Response) => {
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        };

        const [meRes, shiftsRes, workersRes, jobsRes, invoicesRes, venuesRes, clientsRes, timesheetsRes, auditRes] =
          await Promise.all([
            fetch("/api/me"),
            fetch("/api/shifts"),
            fetch("/api/workers"),
            fetch("/api/jobs"),
            fetch("/api/invoices"),
            fetch("/api/venues"),
            fetch("/api/clients"),
            fetch("/api/timesheets"),
            fetch("/api/audit"),
          ]);

        const me = meRes.ok ? await meRes.json() : null;
        setCurrentUser(me);

        if (auditRes.ok) {
          const rawAudit = await auditRes.json();
          const logs = Array.isArray(rawAudit) ? rawAudit : [];
          setAuditPreview(
            logs.slice(0, 6).map((log: Record<string, unknown>) => ({
              id: String(log.id ?? Math.random()),
              title: String(log.action ?? "Audit entry"),
              time:
                log.timestamp != null
                  ? new Date(String(log.timestamp)).toLocaleString()
                  : "",
              description: [log.userEmail, log.details].filter(Boolean).join(" · ") || undefined,
              tone: "default" as const,
            })),
          );
        } else {
          setAuditPreview([]);
        }

        const [shifts, workers, jobs, invoices, venues, clients, timesheets] = await Promise.all([
          asArray(shiftsRes),
          asArray(workersRes),
          asArray(jobsRes),
          asArray(invoicesRes),
          asArray(venuesRes),
          asArray(clientsRes),
          asArray(timesheetsRes),
        ]);

        const isAdmin = me?.role === "admin" || me?.role === "super_admin";
        if (isAdmin) {
          const pendingTs = timesheets.filter(
            (t: any) =>
              t.status === "pending_client_approval" || t.status === "approved_by_client" || t.status === "issue_flagged"
          );
          setAdminKpis({
            workerCount: workers.length,
            clientCount: clients.length,
            pendingWorkerActivations: workers.filter((w: any) => w.status === "Pending").length,
            openJobs: jobs.filter((j: any) => j.status === "Open").length,
            filledJobs: jobs.filter((j: any) => j.status === "Filled").length,
            activeShifts: shifts.filter((s: any) => s.status === "Active").length,
            completedShifts: shifts.filter((s: any) => s.status === "Completed").length,
            pendingTimesheets: pendingTs.length,
            workersDocPending: workers.filter((w: any) => w.documentStatus === "Pending").length,
            clientsPendingPayment: clients.filter((c: any) => c.status === "Pending Payment").length,
            approvedUnbilledShifts: shifts.filter((s: any) => s.isApproved && !s.isInvoiced).length,
            pendingInvoices: invoices.filter((inv: any) => String(inv.status || "").toLowerCase() === "pending").length,
          });
        } else {
          setAdminKpis(null);
        }

        const active = shifts.filter((s: any) => s.status === "Active");
        const totalActiveHours = active.reduce((acc: number, s: any) => acc + (s.hours || 0), 0);
        const flagged = shifts.filter((s: any) => s.isFlagged);
        const upcoming = shifts.filter((s: any) => s.status === "Upcoming");
        const totalRevenue = invoices.reduce((acc: number, inv: any) => acc + inv.amount, 0);

        setStats({
          activeHours: totalActiveHours.toFixed(1),
          loggedToday: shifts.filter((s: any) => s.status === "Completed").length.toString(),
          scheduled: (me?.role === "user"
            ? jobs.filter((j: any) => j.status === "Open").length
            : upcoming.length
          ).toString(),
          overtimeRisk: (me?.role === "user"
            ? venues.length
            : workers.filter((w: any) => w.reliability < 90).length
          ).toString(),
          monthlyRevenue: totalRevenue.toLocaleString(),
        });

        setOngoingShifts(active.length > 0 ? active.slice(0, 4) : []);

        const shiftAlerts = flagged.map((s: any) => ({
          time: "Recently",
          worker: s.workerName || "Unassigned",
          issue: s.flagReason || "Shift Flagged",
          priority: "High",
        }));

        const docPendingWorkers = isAdmin
          ? workers.filter((w: any) => w.documentStatus === "Pending").length
          : 0;
        if (docPendingWorkers > 0) {
          shiftAlerts.unshift({
            time: "Queue",
            worker: "Document review",
            issue: `${docPendingWorkers} worker(s) have documents pending admin review.`,
            priority: "High",
          });
        }

        setAlerts(
          shiftAlerts.length > 0
            ? shiftAlerts
            : [
                {
                  time: "Now",
                  worker: "No alerts",
                  issue: "No active alerts at this time.",
                  priority: "Low",
                },
              ]
        );
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const isClientUser = currentUser?.role === "user";
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin";

  const hourStats = isClientUser
    ? [
        {
          name: "Active Shift Hours",
          value: stats.activeHours,
          suffix: "hrs",
          subtitle: "Current active shifts",
          icon: Activity,
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
        },
        {
          name: "Monthly Invoiced",
          value: stats.monthlyRevenue,
          prefix: "$",
          subtitle: "Invoice total",
          icon: Timer,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        },
        {
          name: "Open Jobs",
          value: stats.scheduled,
          suffix: "jobs",
          subtitle: "Live job postings",
          icon: Clock,
          color: "text-primary",
          bg: "bg-primary/10",
        },
        {
          name: "Active Venues",
          value: stats.overtimeRisk,
          suffix: "venues",
          subtitle: "Configured locations",
          icon: MapPin,
          color: "text-amber-500",
          bg: "bg-amber-500/10",
        },
      ]
    : [
        {
          name: "Live Active Hours",
          value: stats.activeHours,
          suffix: "hrs",
          subtitle: "Currently in field",
          icon: Activity,
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
        },
        {
          name: "Monthly Revenue",
          value: stats.monthlyRevenue,
          prefix: "$",
          subtitle: "Billed this month",
          icon: Timer,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        },
        {
          name: "Scheduled Today",
          value: stats.scheduled,
          suffix: "shifts",
          subtitle: "Remaining for today",
          icon: Clock,
          color: "text-primary",
          bg: "bg-primary/10",
        },
        {
          name: "Reliability Risk",
          value: stats.overtimeRisk,
          suffix: "workers",
          subtitle: "Flagged profiles",
          icon: AlertTriangle,
          color: "text-amber-500",
          bg: "bg-amber-500/10",
        },
      ];

  type AdminStatCard = {
    name: string;
    value: string;
    subtitle: string;
    icon: typeof Users;
    href: string;
    color: string;
    bg: string;
  };

  const adminStatCards: AdminStatCard[] | null = !adminKpis
    ? null
    : [
      {
        name: "Workers",
        value: String(adminKpis.workerCount),
        subtitle:
          adminKpis.pendingWorkerActivations > 0
            ? `${adminKpis.pendingWorkerActivations} pending activation`
            : "On platform",
        icon: Users,
        href: "/dashboard/workers",
        color: "text-sky-500",
        bg: "bg-sky-500/10",
      },
      {
        name: "Clients",
        value: String(adminKpis.clientCount),
        subtitle:
          adminKpis.clientsPendingPayment > 0
            ? `${adminKpis.clientsPendingPayment} pending payment`
            : "Business accounts",
        icon: Building2,
        href: "/dashboard/clients",
        color: "text-violet-500",
        bg: "bg-violet-500/10",
      },
      {
        name: "Open jobs",
        value: String(adminKpis.openJobs),
        subtitle: "Postings accepting applicants",
        icon: Briefcase,
        href: "/dashboard/jobs",
        color: "text-primary",
        bg: "bg-primary/10",
      },
      {
        name: "Assigned",
        value: String(adminKpis.filledJobs),
        subtitle: "Filled postings (awaiting / in progress)",
        icon: UserCheck,
        href: "/dashboard/jobs",
        color: "text-teal-500",
        bg: "bg-teal-500/10",
      },
      {
        name: "Active shifts",
        value: String(adminKpis.activeShifts),
        subtitle: "Checked in now",
        icon: Activity,
        href: "/dashboard/shifts",
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
      },
      {
        name: "Completed",
        value: String(adminKpis.completedShifts),
        subtitle: "Field shifts finished",
        icon: CheckCircle2,
        href: "/dashboard/shifts",
        color: "text-blue-500",
        bg: "bg-blue-500/10",
      },
      {
        name: "Timesheets",
        value: String(adminKpis.pendingTimesheets),
        subtitle: "In client / review workflow",
        icon: ClipboardList,
        href: "/dashboard/shifts",
        color: "text-amber-500",
        bg: "bg-amber-500/10",
      },
      {
        name: "Unbilled",
        value: String(adminKpis.approvedUnbilledShifts),
        subtitle: "Approved shifts ready to invoice",
        icon: ReceiptText,
        href: "/dashboard/invoices",
        color: "text-blue-500",
        bg: "bg-blue-500/10",
      },
      {
        name: "Invoices",
        value: String(adminKpis.pendingInvoices),
        subtitle: "Pending client invoices",
        icon: ReceiptText,
        href: "/dashboard/invoices",
        color: "text-amber-500",
        bg: "bg-amber-500/10",
      },
      ];

  if (loading) {
    return <LoadingState label="Loading operational dashboard" />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
      <WorkspaceCard className="premium-panel" padding="lg">
        <PageHeader
          eyebrow="Staff Tracker OS"
          title={isClientUser ? "Client workspace overview" : isAdmin ? "Admin operations overview" : "Field work overview"}
          description={
            isClientUser
              ? "Your jobs, venues, shifts, timesheet approvals, and invoices in one calm workspace."
              : isAdmin
                ? "Manual-first hospitality staffing operations: worker approvals, jobs, assignments, shifts, timesheets, payments, and invoices."
                : "Live tracking of assigned jobs, hours, and field statuses."
          }
          actions={
            <>
          {isAdmin && adminKpis && adminKpis.workersDocPending > 0 && (
            <Link
              href="/dashboard/documents"
              className="saas-chip border-amber-500/30 bg-amber-500/10 text-amber-700"
            >
              <FileWarning className="w-4 h-4 text-amber-500" />
              <span>
                {adminKpis.workersDocPending} document{adminKpis.workersDocPending === 1 ? "" : "s"} to review
              </span>
            </Link>
          )}
          <div className="status-pill">
            <span>
              {isAdmin && adminKpis
                ? `${adminKpis.activeShifts} active in field`
                : `Tracking ${ongoingShifts.length} Active Jobs`}
            </span>
          </div>
            </>
          }
        />
      </WorkspaceCard>

      {isAdmin && adminStatCards ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {adminStatCards.map((stat, i) => {
            const inner = (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="h-full"
              >
                <MetricCard label={stat.name} value={stat.value} helper={stat.subtitle} icon={stat.icon} />
              </motion.div>
            );
            return (
              <Link key={stat.name} href={stat.href} className="block">
                {inner}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-5 lg:grid-cols-4">
          {hourStats.map((stat, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              key={stat.name}
            >
              <MetricCard
                label={stat.name}
                value={`${stat.prefix || ""}${stat.value}${stat.suffix ? ` ${stat.suffix}` : ""}`}
                helper={stat.subtitle}
                icon={stat.icon}
              />
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium flex items-center gap-2 md:text-lg">
              <Activity className="w-5 h-5 text-primary" />{" "}
              {isClientUser ? "Live Shift Activity" : "Active Field Operations"}
            </h2>
            <span className="text-xs font-medium text-foreground/50">{ongoingShifts.length} active</span>
          </div>
          <WorkspaceCard className="space-y-3" padding="md">
            {ongoingShifts.length === 0 && (
              <EmptyState title="No active shifts right now" description="Upcoming shifts will move here after workers check in." />
            )}
            {ongoingShifts.map((shift, i) => (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                key={shift.id}
                className="command-surface flex items-center justify-between p-3 md:p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {shift.role?.charAt(0) || "S"}
                  </div>
                  <div>
                    <p className="font-medium">{shift.role}</p>
                    <p className="text-xs text-foreground/50 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {shift.venueName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{shift.workerName || "Unassigned"}</p>
                  <div className="mt-1 flex justify-end">
                    <StatusBadge
                      domain="shift"
                      status={shift.status}
                      label={`Live · ${shift.actualCheckIn || "--:--"}`}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </WorkspaceCard>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-medium flex items-center gap-2 text-red-500 md:text-lg">
            <AlertTriangle className="w-5 h-5" /> {isClientUser ? "Account Alerts" : "Operational Alerts"}
          </h2>
          <WorkspaceCard className="space-y-3" padding="md">
            {alerts.map((alert, i) => (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                key={i}
                className={`rounded-xl border p-3 ${
                  alert.priority === "High"
                    ? "bg-red-500/10 border-red-500/20"
                    : "bg-secondary/10 border-secondary"
                } flex flex-col gap-2`}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded ${
                      alert.priority === "High" ? "bg-red-500 text-white" : "bg-foreground/10 text-foreground/50"
                    }`}
                  >
                    {alert.priority} Priority
                  </span>
                  <span className="text-[10px] font-medium text-foreground/30">{alert.time}</span>
                </div>
                <p className="text-sm font-medium">{alert.worker}</p>
                <p className="text-xs text-foreground/70 leading-relaxed">{alert.issue}</p>
              </motion.div>
            ))}
          </WorkspaceCard>
        </div>
      </div>

      {isAdmin && auditPreview.length > 0 && (
        <WorkspaceCard padding="md" className="mt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-medium md:text-lg">Recent audit activity</h2>
            <Link href="/dashboard/audit" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4">
            <ActivityTimeline items={auditPreview} />
          </div>
        </WorkspaceCard>
      )}
    </div>
  );
}
