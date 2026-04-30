"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Lock, ArrowRight, Star, ShieldCheck, Briefcase } from "lucide-react";
import Link from "next/link";

export default function WorkerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 font-[family-name:var(--font-geist-sans)] relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />

      <div className="w-full max-w-md relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 mb-4">
            <Briefcase className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Worker Portal</h1>
          <p className="text-gray-400">View your schedule, clock in, and track earnings.</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-effect p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Work Email</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-400 transition-colors">
                  <User size={18} />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Password</label>
                <button className="text-xs font-bold text-emerald-400 hover:underline">Forgot?</button>
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm"
                />
              </div>
            </div>

            <button 
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 group transition-all"
            >
              Access My Shifts
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0f0f0f] px-2 text-gray-500 font-bold">New to Staftracker?</span></div>
            </div>

            <button className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl border border-white/10 transition-all">
              Apply to Join the Team
            </button>
          </div>
        </motion.div>

        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex justify-center text-emerald-400 mb-1"><Star size={16} /></div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Top Rated</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-center text-emerald-400 mb-1"><ShieldCheck size={16} /></div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Vetted</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-center text-emerald-400 mb-1"><Briefcase size={16} /></div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Fast Pay</p>
          </div>
        </div>

        <p className="mt-12 text-center text-gray-600 text-xs font-medium">
          <Link href="/" className="hover:text-white transition-colors">← Back to Landing Page</Link>
        </p>
      </div>

      <style jsx>{`
        .glass-effect {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
        }
      `}</style>
    </div>
  );
}
