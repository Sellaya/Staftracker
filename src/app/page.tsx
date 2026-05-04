"use client";

import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileCheck2,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";

const boardRows = [
  { role: "Lead bartender", venue: "King West", owner: "Maya", status: "Assigned", color: "#00c875" },
  { role: "Server team", venue: "Yorkville", owner: "Queue", status: "Open", color: "#2457ff" },
  { role: "Line cook", venue: "Distillery", owner: "Ali", status: "Review", color: "#ffcb00" },
  { role: "Security", venue: "Queen St", owner: "Live", status: "Checked in", color: "#e2445c" },
];

const metrics = [
  { label: "Fill rate", value: "94%", icon: BarChart3 },
  { label: "Active shifts", value: "18", icon: Activity },
  { label: "Docs cleared", value: "126", icon: FileCheck2 },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#111827] text-sm font-medium text-white">
            ST
          </div>
          <div>
            <p className="text-base font-medium tracking-tight">Staff Tracker</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Workforce OS</p>
          </div>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          <Link href="/login/worker" className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            Worker
          </Link>
          <Link href="/login/client" className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            Client
          </Link>
          <Link href="/login/admin" className="rounded-lg bg-[#111827] px-3.5 py-2 text-sm font-medium text-white hover:bg-primary">
            Admin Login
          </Link>
        </div>
      </nav>

      <main className="mx-auto grid min-h-[calc(100vh-76px)] w-full max-w-7xl grid-cols-1 items-center gap-6 px-4 pb-8 pt-2 md:px-8 lg:grid-cols-[0.76fr_1.24fr]">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="max-w-2xl"
        >
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="status-pill">Live staffing workspace</span>
            <span className="saas-chip">MVP ready</span>
          </div>
          <h1 className="max-w-xl text-4xl font-medium leading-[1.08] tracking-[-0.03em] text-foreground md:text-6xl">
            Staffing operations, compressed into one calm workspace.
          </h1>
          <p className="mt-5 max-w-xl text-base font-normal leading-relaxed text-muted-foreground md:text-lg">
            Post jobs, approve workers, track live shifts, review compliance, and close timesheets from a calm command center built for hospitality teams.
          </p>
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <Link href="/signup/client" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90">
              Create workspace <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/signup/worker" className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted">
              Join as worker <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {metrics.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="hero-metric-tile flex items-center gap-3.5 p-3.5 sm:gap-4 sm:p-4"
              >
                <div
                  className="relative z-[1] flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/12 via-primary/6 to-primary/0 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ring-1 ring-primary/10"
                  aria-hidden
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div className="relative z-[1] min-w-0 flex-1">
                  <p className="font-sans text-[1.35rem] font-medium leading-none tracking-[-0.03em] text-foreground tabular-nums sm:text-2xl">
                    {value}
                  </p>
                  <p className="mt-1.5 font-mono text-[9px] font-medium uppercase leading-tight tracking-[0.1em] text-muted-foreground">
                    {label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5 }}
          className="premium-panel p-2"
          aria-label="Staff Tracker workspace preview"
        >
          <div className="relative rounded-xl border border-border bg-[#111827] p-2 text-white">
            <div className="grid min-h-[560px] grid-cols-1 overflow-hidden rounded-lg bg-white text-[#111827] shadow-2xl shadow-black/10 md:grid-cols-[176px_1fr]">
              <aside className="hidden border-r border-border bg-[#111827] p-3 text-white md:block">
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-white/8 p-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-xs font-medium text-[#111827]">ST</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">Toronto Ops</p>
                    <p className="text-[11px] text-white/50">Hospitality board</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {[
                    { icon: Briefcase, label: "Jobs", color: "#00c875" },
                    { icon: Users, label: "Workers", color: "#66ccff" },
                    { icon: CalendarDays, label: "Shifts", color: "#ff642e" },
                    { icon: ShieldCheck, label: "Compliance", color: "#ffcb00" },
                  ].map(({ icon: Icon, label, color }, index) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium ${
                        index === 0 ? "bg-white text-[#111827]" : "text-white/68"
                      }`}
                    >
                      <span className="h-5 w-1 rounded-full" style={{ backgroundColor: color }} />
                      <Icon className="h-4 w-4" />
                      {label}
                    </div>
                  ))}
                </div>
              </aside>

              <div className="min-w-0 bg-[#f8fafc]">
                <header className="flex items-center justify-between gap-3 border-b border-border bg-white px-3 py-3 md:px-4">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Command center</p>
                    <h2 className="text-xl font-medium tracking-tight">Tonight&apos;s operations</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="hidden items-center rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground sm:flex">
                      <Search className="mr-2 h-4 w-4" /> Search
                    </div>
                    <button type="button" className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground" aria-label="Notifications">
                      <Bell className="h-4 w-4" />
                      <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--danger)]" />
                    </button>
                  </div>
                </header>

                <div className="grid gap-3 p-3 md:p-4 xl:grid-cols-[1fr_220px]">
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["Open", "12"],
                        ["Assigned", "42"],
                        ["Flagged", "3"],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-border bg-white p-3">
                          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                          <p className="mt-1 text-2xl font-medium">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="overflow-hidden rounded-xl border border-border bg-white">
                      <div className="grid grid-cols-[1.2fr_0.95fr_auto] gap-3 border-b border-border bg-muted px-3 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        <span>Role</span>
                        <span>Venue</span>
                        <span>Status</span>
                      </div>
                      {boardRows.map((row) => (
                        <div key={row.role} className="grid grid-cols-[1.2fr_0.95fr_auto] items-center gap-3 border-b border-border px-3 py-3 text-sm last:border-b-0">
                          <span className="font-medium">{row.role}</span>
                          <span className="font-medium text-muted-foreground">{row.venue}</span>
                          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-1 text-[11px] font-medium">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
                            {row.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <aside className="space-y-3">
                    <div className="rounded-xl border border-border bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">Live feed</p>
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="mt-3 space-y-3">
                        {[
                          ["07:42", "Check-in verified"],
                          ["07:50", "Timesheet ready"],
                          ["08:05", "Worker assigned"],
                        ].map(([time, text]) => (
                          <div key={text} className="flex gap-2">
                            <Clock className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                            <div>
                              <p className="text-xs font-medium">{text}</p>
                              <p className="text-[11px] font-medium text-muted-foreground">{time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-[#111827] p-3 text-white">
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/50">Workflow</p>
                      <div className="mt-3 space-y-2">
                        {["Post", "Approve", "Track", "Bill"].map((item) => (
                          <div key={item} className="flex items-center gap-2 text-sm font-medium">
                            <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
