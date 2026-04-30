"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, CalendarDays, Download, Loader2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

export default function ReportsPage() {
  const [data, setData] = useState({ shifts: [] as any[], jobs: [] as any[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/shifts').then(res => res.json()),
      fetch('/api/jobs').then(res => res.json())
    ]).then(([shifts, jobs]) => {
      setData({ 
        shifts: Array.isArray(shifts) ? shifts : [], 
        jobs: Array.isArray(jobs) ? jobs : [] 
      });
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    const totalJobs = data.jobs.length || 1;
    const filledJobs = data.jobs.filter(j => j.status === "Filled").length;
    const fulfillmentRate = ((filledJobs / totalJobs) * 100).toFixed(1);

    const roles = data.jobs.reduce((acc: any, j: any) => {
      acc[j.role] = (acc[j.role] || 0) + 1;
      return acc;
    }, {});

    const sortedRoles = Object.entries(roles)
      .map(([role, count]: any) => ({ role, percentage: Math.round((count / totalJobs) * 100) }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);

    return {
      fulfillmentRate,
      totalShifts: data.shifts.length,
      roles: sortedRoles
    };
  }, [data]);

  const reports = [
    { title: "Shift Fulfillment Rate", value: `${stats.fulfillmentRate}%`, change: "+2.1%", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "Active Pool Retention", value: "98.5%", change: "+0.5%", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Total Platform Shifts", value: stats.totalShifts.toLocaleString(), change: "+15%", icon: CalendarDays, color: "text-primary", bg: "bg-primary/10" },
  ];

  const handleExportCSV = () => {
    if (data.shifts.length === 0 && data.jobs.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type,ID,Client,Role,Date,Status,Hours,Rate\r\n";
    
    data.jobs.forEach(j => {
      csvContent += `Job,${j.id},${j.clientName},${j.role},${j.date},${j.status},${j.hours},${j.hourlyRate}\r\n`;
    });
    
    data.shifts.forEach(s => {
      csvContent += `Shift,${s.id},${s.clientName || ''},${s.role},${s.date},${s.status},${s.hours},${s.rate || ''}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `platform_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Reports</h1>
          <p className="text-foreground/70 mt-1">Generate analytics and insights on platform performance.</p>
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
            <p className={`text-xs font-medium mt-2 ${report.color}`}>
              Stable performance
            </p>
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
          <h3 className="text-lg font-bold mb-4">Shift Volume Over Time</h3>
          <div className="w-full h-[300px] flex items-end justify-between gap-2">
            {[40, 25, 60, 45, 80, 55, 90, 75, 100, 85, 60, 95].map((height, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.8, delay: 0.5 + i * 0.05 }}
                className="w-full bg-primary/20 hover:bg-primary transition-colors rounded-t-sm"
              />
            ))}
          </div>
          <p className="text-xs text-foreground/40 mt-4 text-center font-medium uppercase tracking-widest">Last 12 Months Activity</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="p-6 rounded-2xl glass bg-background/50 border border-secondary"
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Most Requested Roles
          </h3>
          <div className="space-y-4">
            {stats.roles.length > 0 ? stats.roles.map((stat: any, i: number) => (
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
            )) : (
              <p className="text-sm text-foreground/40 text-center py-10 italic">No job roles recorded yet.</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
