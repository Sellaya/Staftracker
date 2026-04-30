"use client";

import { motion } from "framer-motion";
import { Clock, AlertTriangle, MapPin, Activity, Timer, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeHours: "0.0",
    loggedToday: "0",
    scheduled: "0",
    overtimeRisk: "0"
  });
  const [ongoingShifts, setOngoingShifts] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [shiftsRes, workersRes, jobsRes] = await Promise.all([
          fetch('/api/shifts'),
          fetch('/api/workers'),
          fetch('/api/jobs')
        ]);
        
        const shifts = await shiftsRes.json();
        const workers = await workersRes.json();
        const jobs = await jobsRes.json();

        // Calculate dynamic stats
        const active = shifts.filter((s: any) => s.status === "Active");
        const totalActiveHours = active.reduce((acc: number, s: any) => acc + (s.hours || 0), 0);
        const flagged = shifts.filter((s: any) => s.isFlagged);
        const upcoming = shifts.filter((s: any) => s.status === "Upcoming");
        
        setStats({
          activeHours: totalActiveHours.toFixed(1),
          loggedToday: shifts.filter((s: any) => s.status === "Completed").length.toString(),
          scheduled: upcoming.length.toString(),
          overtimeRisk: workers.filter((w: any) => w.reliability < 90).length.toString()
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
    { name: "Completed Today", value: stats.loggedToday, suffix: "shifts", subtitle: "Awaiting approval", icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500/10" },
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
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="p-6 rounded-2xl glass bg-background/50 border border-secondary"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-foreground/70">{stat.name}</h3>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-4xl font-extrabold tracking-tighter">{stat.value}</span>
              <span className="text-sm font-bold text-foreground/50">{stat.suffix}</span>
            </div>
            <p className={`text-xs font-medium mt-2 ${stat.color}`}>
              {stat.subtitle}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Ongoing Jobs Status */}
        <div className="xl:col-span-2 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            Active Field Operations
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ongoingShifts.length > 0 ? ongoingShifts.map((shift, i) => {
              return (
                <motion.div
                  key={shift.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className={`p-5 rounded-2xl glass border relative overflow-hidden bg-background/50 border-secondary`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{shift.workerName || "Unassigned"}</h3>
                      <p className="text-sm font-medium text-foreground/70">{shift.role} @ {shift.venueName}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500`}>
                      Live
                    </span>
                  </div>

                  <div className="flex items-end justify-between mt-6">
                    <div>
                      <p className="text-xs text-foreground/50 font-medium mb-1">SCHEDULED</p>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-black tracking-tighter text-primary`}>
                          {shift.scheduledStart}
                        </span>
                        <span className="text-sm font-bold text-foreground/50">to {shift.scheduledEnd}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs text-foreground/50 font-medium mb-1">CLOCKED IN</p>
                      <p className="font-mono font-bold text-sm text-emerald-500">{shift.actualCheckIn || "--:--"}</p>
                    </div>
                  </div>
                </motion.div>
              );
            }) : (
              <div className="col-span-2 p-12 text-center glass rounded-2xl border border-secondary text-foreground/40 font-medium">
                No active shifts currently in the field.
              </div>
            )}
          </div>
        </div>

        {/* Field Details & Alerts */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Field Alerts
          </h2>
          
          <div className="glass rounded-2xl bg-background/50 border border-secondary overflow-hidden">
            <div className="divide-y divide-secondary/30">
              {alerts.map((alert, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className={`p-4 hover:bg-secondary/10 transition-colors border-l-4 ${
                    alert.priority === 'High' ? 'border-l-red-500' : 
                    alert.priority === 'Medium' ? 'border-l-amber-500' : 'border-l-blue-500'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm">{alert.worker}</span>
                    <span className="text-xs text-foreground/50">{alert.time}</span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-snug">{alert.issue}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="p-5 rounded-2xl glass bg-primary/5 border border-primary/20 mt-6"
          >
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Live GPS Tracking
            </h3>
            <p className="text-sm text-foreground/70 mb-4">
              Monitor worker locations in real-time to ensure compliance and safety.
            </p>
            <button className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">
              Open Live Map
            </button>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
