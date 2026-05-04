"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Bell, Briefcase, CalendarDays, CheckCircle2, Search, Users } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-black text-white shadow-sm">
            ST
          </div>
          <div>
            <p className="text-lg font-black tracking-tight">Staff Tracker</p>
            <p className="text-xs font-bold text-muted-foreground">Hospitality workforce OS</p>
          </div>
        </Link>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login/worker" className="rounded-xl px-4 py-2 text-sm font-black text-muted-foreground hover:bg-muted hover:text-foreground">
            Worker
          </Link>
          <Link href="/login/client" className="rounded-xl px-4 py-2 text-sm font-black text-muted-foreground hover:bg-muted hover:text-foreground">
            Client
          </Link>
          <Link href="/login/admin" className="rounded-xl bg-primary px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-primary/90">
            Admin Login
          </Link>
        </div>
      </nav>

      <main className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 pb-10 pt-4 md:px-8 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-black uppercase tracking-widest text-primary shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
            Monday clarity, Slack speed
          </div>
          <h1 className="text-5xl font-black leading-[0.96] tracking-tight md:text-7xl">
            Run every shift from one live workspace.
          </h1>
          <p className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-muted-foreground">
            A clean SaaS command center for hospitality teams: post jobs, approve workers, track shifts, review documents, and close timesheets without losing context.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup/client" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-primary/90">
              Create client workspace <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/signup/worker" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-black hover:bg-muted">
              Join as worker <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {[
              ["Verified", "Docs and status"],
              ["Live", "Field tracking"],
              ["Closed", "Timesheet flow"],
            ].map(([title, body]) => (
              <div key={title} className="saas-card p-3">
                <p className="text-sm font-black">{title}</p>
                <p className="mt-1 text-xs font-bold text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.55 }}
          className="saas-card overflow-hidden p-3"
          aria-label="Staff Tracker workspace preview"
        >
          <div className="rounded-xl border border-border bg-[var(--sidebar)] p-3 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#1f2a44] text-sm font-black">ST</div>
                <div>
                  <p className="text-sm font-black">Toronto Ops</p>
                  <p className="text-xs text-white/55">Active workspace</p>
                </div>
              </div>
              <Bell className="h-5 w-5 text-white/70" />
            </div>
            <div className="mt-3 grid grid-cols-[180px_1fr] gap-3">
              <div className="space-y-2">
                {[
                  { icon: Briefcase, label: "Jobs", color: "#00c875" },
                  { icon: Users, label: "Workers", color: "#66ccff" },
                  { icon: CalendarDays, label: "Shifts", color: "#ff642e" },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2 text-sm font-bold">
                    <Icon className="h-4 w-4" style={{ color }} />
                    {label}
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-white p-4 text-[#172033]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Shift board</p>
                    <h2 className="text-xl font-black">Tonight&apos;s operations</h2>
                  </div>
                  <div className="hidden items-center rounded-lg bg-muted px-3 py-2 text-xs font-bold text-muted-foreground sm:flex">
                    <Search className="mr-2 h-4 w-4" /> Search
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    ["Bartender", "King West", "Assigned", "#00c875"],
                    ["Server", "Yorkville", "Open", "#579bfc"],
                    ["Line Cook", "Distillery", "Review", "#ffcb00"],
                    ["Security", "Queen St", "Live", "#e2445c"],
                  ].map(([role, venue, status, color]) => (
                    <div key={role} className="grid grid-cols-[1fr_1fr_auto] items-center gap-3 rounded-lg border border-border bg-card px-3 py-3 text-sm">
                      <span className="font-black">{role}</span>
                      <span className="font-bold text-muted-foreground">{venue}</span>
                      <span className="rounded-full px-2 py-1 text-[11px] font-black text-white" style={{ backgroundColor: color }}>
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4">
            {["Post", "Approve", "Track", "Bill"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs font-black text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                {item}
              </div>
            ))}
          </div>
        </motion.section>
      </main>
    </div>
  );
}
