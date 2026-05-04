"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, CalendarDays, Download, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ShiftRow = {
  id: string;
  venueName?: string;
  role?: string;
  date?: string;
  hours?: number;
  rate?: number;
  status?: string;
  paymentStatus?: string;
};

type TimesheetRow = {
  shiftId?: string | null;
  status?: string;
};

function parseMoney(s: string): number {
  const n = Number(String(s).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export default function WorkerEarnings() {
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetRow[]>([]);
  const [profileLifetime, setProfileLifetime] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [shRes, tsRes, prRes] = await Promise.all([
          fetch("/api/shifts", { cache: "no-store" }),
          fetch("/api/timesheets", { cache: "no-store" }),
          fetch("/api/worker/profile", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        const shData = shRes.ok ? await shRes.json() : [];
        const tsData = tsRes.ok ? await tsRes.json() : [];
        const prData = prRes.ok ? await prRes.json() : null;
        setShifts(Array.isArray(shData) ? shData : []);
        setTimesheets(Array.isArray(tsData) ? tsData : []);
        setProfileLifetime(prData?.lifetimeEarnings != null ? String(prData.lifetimeEarnings) : null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tsByShift = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of timesheets) {
      if (t.shiftId) m.set(String(t.shiftId), String(t.status || ""));
    }
    return m;
  }, [timesheets]);

  const earningsHistory = useMemo(() => {
    const rows: {
      id: string;
      date: string;
      venue: string;
      role: string;
      hours: number;
      pay: number;
      status: string;
    }[] = [];

    for (const s of shifts) {
      if (String(s.status) !== "Completed") continue;
      const hours = Number(s.hours ?? 0);
      const rate = Number(s.rate ?? 0);
      const pay = hours * rate;
      const tsSt = tsByShift.get(s.id);
      let label = String(s.paymentStatus || "pending");
      if (tsSt === "approved_by_client" || tsSt === "approved_by_admin") label = `Pay: ${label}`;
      if (tsSt === "pending_client_approval") label = "Timesheet pending approval";
      if (tsSt === "rejected_by_admin") label = "Timesheet rejected";
      if (tsSt === "issue_flagged") label = "Issue under review";
      rows.push({
        id: s.id,
        date: s.date ? String(s.date) : "—",
        venue: s.venueName ? String(s.venueName) : "—",
        role: s.role ? String(s.role) : "—",
        hours,
        pay,
        status: label,
      });
    }
    rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return rows;
  }, [shifts, tsByShift]);

  const lifetimeGross = useMemo(
    () => earningsHistory.reduce((acc, r) => acc + r.pay, 0),
    [earningsHistory],
  );

  const paidTotal = useMemo(() => {
    return shifts
      .filter((s) => String(s.status) === "Completed" && String(s.paymentStatus) === "paid")
      .reduce((acc, s) => acc + Number(s.hours ?? 0) * Number(s.rate ?? 0), 0);
  }, [shifts]);

  const displayLifetime = profileLifetime && parseMoney(profileLifetime) > 0 ? profileLifetime : `$${lifetimeGross.toFixed(2)}`;

  const exportCsv = () => {
    if (earningsHistory.length === 0) return;
    let csv = "data:text/csv;charset=utf-8,";
    csv += "ShiftId,Date,Venue,Role,Hours,RateImpliedPay,PaymentStatus\r\n";
    earningsHistory.forEach((r) => {
      csv += `${r.id},${r.date},${JSON.stringify(r.venue)},${JSON.stringify(r.role)},${r.hours},${r.pay.toFixed(2)},${JSON.stringify(r.status)}\r\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `earnings_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Earnings & Timesheets</h1>
          <p className="text-foreground/70 mt-1">
            Gross pay from completed shifts (hours × rate). Payouts follow your payment status on each shift.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={earningsHistory.length === 0}
          className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-secondary/80 transition-colors disabled:opacity-40"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-primary/5 border border-emerald-500/20 col-span-1 md:col-span-2 flex flex-col justify-center">
          <p className="text-sm font-medium text-emerald-500 mb-1">Marked paid (platform)</p>
          <div className="flex items-end gap-4 flex-wrap">
            <h2 className="text-5xl font-medium text-foreground">${paidTotal.toFixed(2)}</h2>
            <button
              type="button"
              disabled
              title="Bank transfers are not wired in this MVP"
              className="mb-1 px-6 py-2 bg-emerald-500/40 text-white rounded-full font-medium cursor-not-allowed opacity-70"
            >
              Transfer to Bank
            </button>
          </div>
          <p className="text-xs text-foreground/50 mt-2">Sum of completed shifts with payment status &quot;paid&quot;.</p>
        </div>

        <div className="p-6 rounded-3xl bg-secondary/10 border border-secondary flex flex-col justify-center">
          <p className="text-sm font-medium text-foreground/50 mb-1">Lifetime gross (completed)</p>
          <h2 className="text-3xl font-medium text-foreground mb-2">{displayLifetime}</h2>
          <p className="text-xs font-medium text-emerald-500 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> From your shift history
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-medium mb-4 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" /> Completed shifts
        </h3>
        <div className="glass rounded-2xl bg-background/50 border border-secondary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/30 text-foreground/70 border-b border-secondary/50 select-none">
                <tr>
                  <th className="px-6 py-4 font-medium">Date & Venue</th>
                  <th className="px-6 py-4 font-medium">Role & Hours</th>
                  <th className="px-6 py-4 font-medium text-right">Gross pay</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {earningsHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-foreground/50 text-sm">
                      No completed shifts yet. Finish a shift (clock out) to see earnings here.
                    </td>
                  </tr>
                ) : (
                  earningsHistory.map((item, i) => (
                    <motion.tr
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      key={item.id}
                      className="border-b border-secondary/20 hover:bg-secondary/10 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium">{item.date}</p>
                        <p className="text-xs text-foreground/50">{item.venue}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium">{item.role}</p>
                        <p className="text-xs text-foreground/50">{item.hours} hrs × rate</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-medium text-emerald-500 text-lg">${item.pay.toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-xs font-medium border border-emerald-500/20 max-w-[14rem] inline-block truncate">
                          {item.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
