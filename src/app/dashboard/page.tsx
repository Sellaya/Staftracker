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
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

type AdminKpis = {
  workerCount: number;
  clientCount: number;
  openJobs: number;
  filledJobs: number;
  activeShifts: number;
  completedShifts: number;
  pendingTimesheets: number;
  workersDocPending: number;
  clientsPendingPayment: number;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const asArray = async (res: Response) => {
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        };

        const [meRes, shiftsRes, workersRes, jobsRes, invoicesRes, venuesRes, clientsRes, timesheetsRes] =
          await Promise.all([
            fetch("/api/me"),
            fetch("/api/shifts"),
            fetch("/api/workers"),
            fetch("/api/jobs"),
            fetch("/api/invoices"),
            fetch("/api/venues"),
            fetch("/api/clients"),
            fetch("/api/timesheets"),
          ]);

        const me = meRes.ok ? await meRes.json() : null;
        setCurrentUser(me);
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
              t.status === "pending_client_approval" || t.status === "approved_by_client"
          );
          setAdminKpis({
            workerCount: workers.length,
            clientCount: clients.length,
            openJobs: jobs.filter((j: any) => j.status === "Open").length,
            filledJobs: jobs.filter((j: any) => j.status === "Filled").length,
            activeShifts: shifts.filter((s: any) => s.status === "Active").length,
            completedShifts: shifts.filter((s: any) => s.status === "Completed").length,
            pendingTimesheets: pendingTs.length,
            workersDocPending: workers.filter((w: any) => w.documentStatus === "Pending").length,
            clientsPendingPayment: clients.filter((c: any) => c.status === "Pending Payment").length,
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
        subtitle: "On platform",
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
        name: "Open shifts",
        value: String(adminKpis.openJobs),
        subtitle: "Job postings accepting workers",
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
      ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isClientUser
              ? "Client Account Details"
              : isAdmin
                ? "Admin overview"
                : "Field Work & Hours"}
          </h1>
          <p className="text-foreground/70 mt-1">
            {isClientUser
              ? "Overview of your jobs, venues, shifts, and invoices."
              : isAdmin
                ? "Workers, clients, shift pipeline, and timesheets (MVP Week 1–3 scope per spec)."
                : "Live tracking of ongoing jobs, worker hours, and field statuses."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isAdmin && adminKpis && adminKpis.workersDocPending > 0 && (
            <Link
              href="/dashboard/documents"
              className="glass px-4 py-2 rounded-xl flex items-center gap-2 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15 transition-colors"
            >
              <FileWarning className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">
                {adminKpis.workersDocPending} document{adminKpis.workersDocPending === 1 ? "" : "s"} to review
              </span>
            </Link>
          )}
          <div className="glass px-4 py-2 rounded-xl flex items-center gap-2 border border-secondary">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium">
              {isAdmin && adminKpis
                ? `${adminKpis.activeShifts} active in field`
                : `Tracking ${ongoingShifts.length} Active Jobs`}
            </span>
          </div>
        </div>
      </div>

      {isAdmin && adminStatCards ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {adminStatCards.map((stat, i) => {
            const inner = (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass p-5 rounded-2xl border border-secondary bg-background/60 hover:bg-secondary/10 transition-all h-full"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                    <stat.icon size={20} />
                  </div>
                </div>
                <p className="text-[11px] font-bold text-foreground/50 uppercase tracking-widest">{stat.name}</p>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-3xl font-black tracking-tight">{stat.value}</span>
                </div>
                <p className="text-xs font-medium text-foreground/40 mt-2">{stat.subtitle}</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {hourStats.map((stat, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              key={stat.name}
              className="glass p-5 rounded-2xl border border-secondary bg-background/60 hover:bg-secondary/10 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold text-foreground/50 uppercase tracking-widest">{stat.name}</p>
                <div className="flex items-baseline gap-1 mt-1.5">
                  {stat.prefix && <span className="text-xl font-black text-foreground/50">{stat.prefix}</span>}
                  <span className="text-3xl font-black tracking-tight">{stat.value}</span>
                  {stat.suffix && <span className="text-xs font-bold text-foreground/50">{stat.suffix}</span>}
                </div>
                <p className="text-xs font-medium text-foreground/40 mt-2">{stat.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />{" "}
              {isClientUser ? "Live Shift Activity" : "Active Field Operations"}
            </h2>
            <span className="text-xs font-bold text-foreground/50">{ongoingShifts.length} active</span>
          </div>
          <div className="rounded-2xl border border-secondary bg-background/50 p-4 space-y-3">
            {ongoingShifts.length === 0 && (
              <div className="p-10 border border-dashed border-secondary rounded-2xl text-center text-foreground/50 italic">
                No active shifts right now.
              </div>
            )}
            {ongoingShifts.map((shift, i) => (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                key={shift.id}
                className="p-4 rounded-xl border border-secondary bg-background/80 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {shift.role?.charAt(0) || "S"}
                  </div>
                  <div>
                    <p className="font-bold">{shift.role}</p>
                    <p className="text-xs text-foreground/50 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {shift.venueName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{shift.workerName || "Unassigned"}</p>
                  <p className="text-xs text-emerald-500 font-medium">
                    Checked in {shift.actualCheckIn || "--:--"}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-red-500">
            <AlertTriangle className="w-5 h-5" /> {isClientUser ? "Account Alerts" : "Operational Alerts"}
          </h2>
          <div className="rounded-2xl border border-secondary bg-background/50 p-4 space-y-3">
            {alerts.map((alert, i) => (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                key={i}
                className={`p-3 rounded-xl border ${
                  alert.priority === "High"
                    ? "bg-red-500/10 border-red-500/20"
                    : "bg-secondary/10 border-secondary"
                } flex flex-col gap-2`}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                      alert.priority === "High" ? "bg-red-500 text-white" : "bg-foreground/10 text-foreground/50"
                    }`}
                  >
                    {alert.priority} Priority
                  </span>
                  <span className="text-[10px] font-bold text-foreground/30">{alert.time}</span>
                </div>
                <p className="text-sm font-bold">{alert.worker}</p>
                <p className="text-xs text-foreground/70 leading-relaxed">{alert.issue}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .glass {
          background: rgba(var(--background-rgb), 0.5);
          backdrop-filter: blur(10px);
        }
      `}</style>
    </div>
  );
}
