"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, CalendarDays, Download } from "lucide-react";

export default function ReportsPage() {
  const reports = [
    { title: "Shift Fulfillment Rate", value: "94.2%", change: "+2.1%", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "Worker Retention", value: "88.5%", change: "+0.5%", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Total Shifts (MTD)", value: "1,248", change: "+15%", icon: CalendarDays, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Reports</h1>
          <p className="text-foreground/70 mt-1">Generate analytics and insights on platform performance.</p>
        </div>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center gap-2">
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
              {report.change} from last month
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
            {[
              { role: "Server", percentage: 45 },
              { role: "Bartender", percentage: 25 },
              { role: "Chef / Line Cook", percentage: 15 },
              { role: "Host", percentage: 10 },
              { role: "Dishwasher", percentage: 5 },
            ].map((stat, i) => (
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
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
