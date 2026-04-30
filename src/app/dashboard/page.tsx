"use client";

import { motion } from "framer-motion";
import { Clock, AlertTriangle, MapPin, Activity, Timer, CheckCircle2 } from "lucide-react";

export default function Dashboard() {
  const hourStats = [
    { name: "Live Active Hours", value: "142.5", suffix: "hrs", subtitle: "Currently in field", icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "Hours Logged Today", value: "385", suffix: "hrs", subtitle: "Completed & approved", icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "Scheduled (Remaining)", value: "210", suffix: "hrs", subtitle: "For rest of day", icon: Clock, color: "text-primary", bg: "bg-primary/10" },
    { name: "Overtime Risk", value: "14", suffix: "workers", subtitle: "Approaching 44hrs", icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  const ongoingJobs = [
    {
      id: "JOB-991",
      worker: "Olivia Martin",
      role: "Server",
      venue: "The Rustic Table",
      hoursElapsed: 5.5,
      totalHours: 8,
      status: "On Track",
      clockInTime: "4:00 PM",
    },
    {
      id: "JOB-992",
      worker: "Jackson Lee",
      role: "Chef",
      venue: "Downtown Events Co.",
      hoursElapsed: 9.2,
      totalHours: 8,
      status: "Overtime",
      clockInTime: "12:00 PM",
    },
    {
      id: "JOB-993",
      worker: "Sofia Davis",
      role: "Bartender",
      venue: "Grand Hotel",
      hoursElapsed: 1.5,
      totalHours: 6,
      status: "On Track",
      clockInTime: "8:00 PM",
    },
    {
      id: "JOB-994",
      worker: "William Kim",
      role: "Dishwasher",
      venue: "The Rustic Table",
      hoursElapsed: 7.8,
      totalHours: 8,
      status: "Ending Soon",
      clockInTime: "2:00 PM",
    }
  ];

  const fieldAlerts = [
    { time: "10 mins ago", worker: "Jackson Lee", issue: "Exceeded scheduled 8 hours (Currently +1.2h)", priority: "High" },
    { time: "25 mins ago", worker: "Sarah Connor", issue: "GPS signal lost at Grand Hotel", priority: "Medium" },
    { time: "1 hr ago", worker: "David Chen", issue: "Missed scheduled break", priority: "Low" }
  ];

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
            <span className="text-sm font-medium">Tracking 24 Active Jobs</span>
          </div>
        </div>
      </div>

      {/* Hero Stats - Hour Centric */}
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
        
        {/* Ongoing Jobs Status (Prominent Hours) */}
        <div className="xl:col-span-2 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            Ongoing Jobs Status
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ongoingJobs.map((job, i) => {
              const progressPercentage = Math.min((job.hoursElapsed / job.totalHours) * 100, 100);
              const isOvertime = job.hoursElapsed > job.totalHours;
              
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className={`p-5 rounded-2xl glass border relative overflow-hidden ${
                    isOvertime ? 'bg-red-500/5 border-red-500/30' : 'bg-background/50 border-secondary'
                  }`}
                >
                  {/* Progress Bar Background */}
                  <div 
                    className={`absolute bottom-0 left-0 h-1 transition-all duration-1000 ${isOvertime ? 'bg-red-500' : 'bg-primary'}`} 
                    style={{ width: `${progressPercentage}%` }} 
                  />

                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{job.worker}</h3>
                      <p className="text-sm font-medium text-foreground/70">{job.role} @ {job.venue}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      isOvertime ? 'bg-red-500 text-white animate-pulse' : 
                      job.status === 'Ending Soon' ? 'bg-amber-500 text-white' : 'bg-secondary text-foreground'
                    }`}>
                      {job.status}
                    </span>
                  </div>

                  <div className="flex items-end justify-between mt-6">
                    <div>
                      <p className="text-xs text-foreground/50 font-medium mb-1">HOURS WORKED</p>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-black tracking-tighter ${isOvertime ? 'text-red-500' : 'text-primary'}`}>
                          {job.hoursElapsed.toFixed(1)}
                        </span>
                        <span className="text-sm font-bold text-foreground/50">/ {job.totalHours} hrs</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs text-foreground/50 font-medium mb-1">CLOCKED IN</p>
                      <p className="font-mono font-bold text-sm">{job.clockInTime}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
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
              {fieldAlerts.map((alert, i) => (
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
            <button className="w-full p-3 text-sm font-bold text-primary hover:bg-secondary/20 transition-colors border-t border-secondary/30">
              View All Field Logs
            </button>
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
              All 24 active workers are currently reporting stable GPS coordinates within their venue geofences.
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
