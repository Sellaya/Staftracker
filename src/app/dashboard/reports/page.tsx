"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp, CalendarDays, Download, Loader2, Receipt } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

export default function ReportsPage() {
  const [data, setData] = useState({
    shifts: [] as any[],
    jobs: [] as any[],
    invoices: [] as any[],
    timesheets: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const arr = async (res: Response) => {
      if (!res.ok) return [];
      const j = await res.json();
      return Array.isArray(j) ? j : [];
    };
    Promise.all([
      fetch("/api/shifts").then(arr),
      fetch("/api/jobs").then(arr),
      fetch("/api/invoices").then(arr),
      fetch("/api/timesheets").then(arr),
    ])
      .then(([shifts, jobs, invoices, timesheets]) => {
        setData({ shifts, jobs, invoices, timesheets });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const jobs = data.jobs;
    const totalJobs = Math.max(jobs.length, 1);
    const filledJobs = jobs.filter((j) => j.status === "Filled").length;
    const fulfillmentRate = ((filledJobs / totalJobs) * 100).toFixed(1);

    const roles = jobs.reduce((acc: any, j: any) => {
      acc[j.role] = (acc[j.role] || 0) + 1;
      return acc;
    }, {});

    const sortedRoles = Object.entries(roles)
      .map(([role, count]: any) => ({ role, percentage: Math.round((count / totalJobs) * 100) }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);

    const invoiceTotal = data.invoices.reduce((acc: number, inv: any) => acc + Number(inv.amount ?? 0), 0);
    const invoicePending = data.invoices.filter((inv: any) => String(inv.status || "").toLowerCase() === "pending").length;

    const approvedTs = data.timesheets.filter(
      (t: any) => String(t.status || "").includes("approved") || String(t.status || "") === "approved_by_client",
    ).length;

    return {
      fulfillmentRate,
      totalShifts: data.shifts.length,
      roles: sortedRoles,
      invoiceTotal,
      invoicePending,
      approvedTs,
    };
  }, [data]);

  const monthlyShiftBuckets = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const s of data.shifts) {
      if (String(s.status) !== "Completed") continue;
      const d = String(s.date || "").slice(0, 7);
      if (!d || d.length < 7) continue;
      buckets.set(d, (buckets.get(d) || 0) + 1);
    }
    const keys = [...buckets.keys()].sort();
    const last6 = keys.slice(-6);
    const max = Math.max(1, ...last6.map((k) => buckets.get(k) || 0));
    return last6.map((month) => ({
      month,
      count: buckets.get(month) || 0,
      pct: Math.round(((buckets.get(month) || 0) / max) * 100),
    }));
  }, [data.shifts]);

  const reports = [
    {
      title: "Shift fulfillment rate",
      value: `${stats.fulfillmentRate}%`,
      sub: `${data.jobs.filter((j) => j.status === "Filled").length} filled of ${data.jobs.length} jobs`,
      icon: TrendingUp,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Invoiced revenue (all statuses)",
      value: `$${stats.invoiceTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${stats.invoicePending} invoice(s) pending · ${data.invoices.length} total`,
      icon: Receipt,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Platform shifts",
      value: stats.totalShifts.toLocaleString(),
      sub: `${stats.approvedTs} timesheet(s) client-approved`,
      icon: CalendarDays,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  const handleExportCSV = () => {
    if (data.shifts.length === 0 && data.jobs.length === 0 && data.invoices.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type,ID,Client,Role,Date,Status,Hours,Rate,Amount\r\n";

    data.jobs.forEach((j) => {
      csvContent += `Job,${j.id},${j.clientName},${j.role},${j.date},${j.status},${j.hours},${j.hourlyRate ?? ""},\r\n`;
    });

    data.shifts.forEach((s) => {
      csvContent += `Shift,${s.id},${s.clientName || ""},${s.role},${s.date},${s.status},${s.hours},${s.rate || ""},\r\n`;
    });

    data.invoices.forEach((inv: any) => {
      csvContent += `Invoice,${inv.id},${inv.clientName || inv.clientId},—,—,${inv.status},—,—,${inv.amount}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `platform_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Reports</h1>
          <p className="text-foreground/70 mt-1">Analytics from live jobs, shifts, invoices, and timesheets.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reports.map((report, i) => (
          <motion.div
            key={report.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="p-6 rounded-2xl glass bg-background/50 border border-secondary"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground/70">{report.title}</h3>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${report.bg}`}>
                <report.icon className={`w-4 h-4 ${report.color}`} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{report.value}</span>
            </div>
            <p className={`text-xs font-medium mt-2 text-foreground/60`}>{report.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="p-6 rounded-2xl glass bg-background/50 border border-secondary min-h-[400px]"
        >
          <h3 className="text-lg font-bold mb-4">Completed shifts by month (YYYY-MM)</h3>
          {monthlyShiftBuckets.length === 0 ? (
            <p className="text-sm text-foreground/50 py-16 text-center">No dated shifts yet.</p>
          ) : (
            <div className="w-full h-[300px] flex items-end justify-between gap-2 px-2">
              {monthlyShiftBuckets.map(({ month, pct, count }) => (
                <div key={month} className="flex flex-col items-center gap-2 flex-1 min-w-0">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(8, pct)}%` }}
                    transition={{ duration: 0.6 }}
                    className="w-full bg-primary/30 hover:bg-primary/50 transition-colors rounded-t-sm min-h-[8px]"
                    title={`${month}: ${count}`}
                  />
                  <span className="text-[10px] font-bold text-foreground/50 truncate w-full text-center">{month.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-foreground/40 mt-4 text-center font-medium uppercase tracking-widest">
            Last {monthlyShiftBuckets.length} month(s) with data
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="p-6 rounded-2xl glass bg-background/50 border border-secondary"
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Most requested roles
          </h3>
          <div className="space-y-4">
            {stats.roles.length > 0 ? (
              stats.roles.map((stat: any, i: number) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{stat.role}</span>
                    <span className="font-bold text-primary">{stat.percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.percentage}%` }}
                      transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                      className="h-full bg-primary"
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-foreground/40 text-center py-10 italic">No job roles recorded yet.</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
