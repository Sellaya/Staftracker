"use client";

import { motion } from "framer-motion";
import { BrainCircuit, Sliders, Zap, History, Settings2 } from "lucide-react";

export default function AIEnginePage() {
  const recentAssignments: { shift: string; match: string; time: string }[] = [];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BrainCircuit className="w-8 h-8 text-primary" />
          AI Assignment Engine
        </h1>
        <p className="text-foreground/70 mt-1">Fine-tune the algorithm weights for automatic shift assignments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl glass bg-background/50 border border-secondary"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" /> Priority Weighting
            </h2>
            
            <div className="space-y-8">
              {/* Slider 1 */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-sm">Worker Rating (Stars)</span>
                  <span className="font-bold text-primary text-sm">40%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '40%' }}></div>
                </div>
              </div>
              
              {/* Slider 2 */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-sm">Reliability Score (Completion Rate)</span>
                  <span className="font-bold text-primary text-sm">35%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '35%' }}></div>
                </div>
              </div>

              {/* Slider 3 */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-sm">Proximity to Venue (Distance)</span>
                  <span className="font-bold text-primary text-sm">25%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '25%' }}></div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">
                Save Algorithm Weights
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl glass bg-background/50 border border-secondary"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" /> Assignment Restrictions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-secondary rounded-xl bg-secondary/10">
                <p className="text-sm text-foreground/70 mb-2">Max Assignment Radius</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">25 km</span>
                  <button className="text-sm text-primary font-medium">Edit</button>
                </div>
              </div>
              <div className="p-4 border border-secondary rounded-xl bg-secondary/10">
                <p className="text-sm text-foreground/70 mb-2">Min. Reliability Score</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">85%</span>
                  <button className="text-sm text-primary font-medium">Edit</button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-2xl glass bg-primary/5 border border-primary/20"
          >
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> AI Live Call Agent
            </h3>
            <p className="text-sm text-foreground/70 mb-4">
              The 24/7 Voice AI is currently active, routing calls and handling shift inquiries.
            </p>
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-secondary">
              <span className="text-sm font-medium">Status</span>
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <button className="w-full mt-4 bg-background border border-secondary text-foreground py-2 rounded-lg text-sm font-medium hover:bg-secondary/50 transition-colors">
              View Call Transcripts
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-2xl glass bg-background/50 border border-secondary"
          >
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <History className="w-4 h-4" /> Recent AI Assignments
            </h3>
            <div className="space-y-3">
              {recentAssignments.map((log, i) => (
                <div key={i} className="text-sm border-b border-secondary/30 pb-2 last:border-0 last:pb-0">
                  <p className="font-medium truncate">{log.shift}</p>
                  <div className="flex justify-between text-xs text-foreground/50 mt-1">
                    <span>Matched: {log.match}</span>
                    <span>{log.time}</span>
                  </div>
                </div>
              ))}
              {recentAssignments.length === 0 && (
                <p className="text-sm text-foreground/50">No assignment history yet.</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
