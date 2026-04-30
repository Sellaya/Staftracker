"use client";

import { motion } from "framer-motion";
import { Clock, AlertTriangle, MapPin, Activity, Timer, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeHours: "0.0",
    loggedToday: "0",
    scheduled: "0",
    overtimeRisk: "0",
    monthlyRevenue: "0"
  });
  const [ongoingShifts, setOngoingShifts] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [shiftsRes, workersRes, jobsRes, invoicesRes] = await Promise.all([
          fetch('/api/shifts'),
          fetch('/api/workers'),
          fetch('/api/jobs'),
          fetch('/api/invoices')
        ]);
        
        const shifts = await shiftsRes.json();
        const workers = await workersRes.json();
        const jobs = await jobsRes.json();
        const invoices = await invoicesRes.json();

        // Calculate dynamic stats
        const active = Array.isArray(shifts) ? shifts.filter((s: any) => s.status === "Active") : [];
        const totalActiveHours = active.reduce((acc: number, s: any) => acc + (s.hours || 0), 0);
        const flagged = Array.isArray(shifts) ? shifts.filter((s: any) => s.isFlagged) : [];
        const upcoming = Array.isArray(shifts) ? shifts.filter((s: any) => s.status === "Upcoming") : [];
        const totalRevenue = Array.isArray(invoices) ? invoices.reduce((acc: number, inv: any) => acc + inv.amount, 0) : 0;
        
        setStats({
          activeHours: totalActiveHours.toFixed(1),
          loggedToday: Array.isArray(shifts) ? shifts.filter((s: any) => s.status === "Completed").length.toString() : "0",
          scheduled: upcoming.length.toString(),
          overtimeRisk: Array.isArray(workers) ? workers.filter((w: any) => w.reliability < 90).length.toString() : "0",
          monthlyRevenue: totalRevenue.toLocaleString()
        });

        setOngoingShifts(active.length > 0 ? active.slice(0, 4) : []);
        
        const shiftAlerts = flagged.map((s: any) => ({
          time: "Recently",
          worker: s.workerName || "Unassigned",
          issue: s.flagReason || "Shift Flagged",
          priority: "High"
        }));
        setAlerts(shiftAlerts.length > 0 ? shiftAlerts : [
          { time: "System", worker: "Oversight", issue: "No active field alerts at this time.", priority: "Low" }
        ]);

      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const hourStats = [
    { name: "Live Active Hours", value: stats.activeHours, suffix: "hrs", subtitle: "Currently in field", icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "Monthly Revenue", value: stats.monthlyRevenue, prefix: "$", subtitle: "Billed this month", icon: Timer, color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "Scheduled Today", value: stats.scheduled, suffix: "shifts", subtitle: "Remaining for today", icon: Clock, color: "text-primary", bg: "bg-primary/10" },
    { name: "Reliability Risk", value: stats.overtimeRisk, suffix: "workers", subtitle: "Flagged profiles", icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Field Work & Hours</h1>
          <p className="text-foreground/70 mt-1">Live tracking of ongoing jobs, worker hours, and field statuses.</p>
        </div>
        <div className="flex gap-3">
          <div className="glass px-4 py-2 rounded-xl flex items-center gap-2 border border-secondary">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium">Tracking {ongoingShifts.length} Active Jobs</span>
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {hourStats.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.name}
            className="glass p-6 rounded-3xl border border-secondary bg-background/50 hover:bg-secondary/10 transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground/50 uppercase tracking-widest">{stat.name}</p>
              <div className="flex items-baseline gap-1 mt-1">
                {stat.prefix && <span className="text-2xl font-black text-foreground/50">{stat.prefix}</span>}
                <span className="text-4xl font-black tracking-tight">{stat.value}</span>
                {stat.suffix && <span className="text-sm font-bold text-foreground/50">{stat.suffix}</span>}
              </div>
              <p className="text-xs font-medium text-foreground/40 mt-2 flex items-center gap-1">
                {stat.subtitle}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Field Operations */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Active Field Operations
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {ongoingShifts.length === 0 && (
              <div className="p-12 border border-dashed border-secondary rounded-3xl text-center text-foreground/50 italic">
                No active field operations right now.
              </div>
            )}
            {ongoingShifts.map((shift, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={shift.id} 
                className="p-5 rounded-3xl border border-secondary bg-background/40 hover:bg-secondary/5 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {shift.role.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold group-hover:text-primary transition-colors">{shift.role}</p>
                    <p className="text-xs text-foreground/50 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {shift.venueName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{shift.workerName}</p>
                  <p className="text-xs text-emerald-500 font-medium">Checked in {shift.actualCheckIn}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Live Alerts */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-red-500">
            <AlertTriangle className="w-5 h-5" /> Operational Alerts
          </h2>
          <div className="space-y-4">
            {alerts.map((alert, i) => (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={i} 
                className={`p-4 rounded-3xl border ${alert.priority === 'High' ? 'bg-red-500/10 border-red-500/20' : 'bg-secondary/10 border-secondary'} flex flex-col gap-2`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${alert.priority === 'High' ? 'bg-red-500 text-white' : 'bg-foreground/10 text-foreground/50'}`}>
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
