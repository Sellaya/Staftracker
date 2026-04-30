"use client";

import { motion } from "framer-motion";
import { DollarSign, ArrowUpRight, CalendarDays, Download } from "lucide-react";

export default function WorkerEarnings() {
  const earningsHistory: any[] = [];

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Earnings & Timesheets</h1>
          <p className="text-foreground/70 mt-1">Track your income and download your pay stubs.</p>
        </div>
        <button className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-secondary/80 transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-primary/5 border border-emerald-500/20 col-span-1 md:col-span-2 flex flex-col justify-center">
          <p className="text-sm font-bold text-emerald-500 mb-1">Available to Withdraw</p>
          <div className="flex items-end gap-4">
            <h2 className="text-5xl font-black text-foreground">$0.00</h2>
            <button className="mb-1 px-6 py-2 bg-emerald-500 text-white rounded-full font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors">
              Transfer to Bank
            </button>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-secondary/10 border border-secondary flex flex-col justify-center">
          <p className="text-sm font-bold text-foreground/50 mb-1">Lifetime Earnings</p>
          <h2 className="text-3xl font-black text-foreground mb-2">$0.00</h2>
          <p className="text-xs font-bold text-emerald-500 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +0% this month
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4">Past Shifts</h3>
        <div className="glass rounded-2xl bg-background/50 border border-secondary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/30 text-foreground/70 border-b border-secondary/50 select-none">
                <tr>
                  <th className="px-6 py-4 font-medium">Date & Venue</th>
                  <th className="px-6 py-4 font-medium">Role & Hours</th>
                  <th className="px-6 py-4 font-medium text-right">Total Pay</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {earningsHistory.map((item, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                    key={i} 
                    className="border-b border-secondary/20 hover:bg-secondary/10 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold">{item.date}</p>
                      <p className="text-xs text-foreground/50">{item.venue}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{item.role}</p>
                      <p className="text-xs text-foreground/50">{item.hours} hrs completed</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-black text-emerald-500 text-lg">${item.pay.toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-xs font-bold border border-emerald-500/20">
                        {item.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
