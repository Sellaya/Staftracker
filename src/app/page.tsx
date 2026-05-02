"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Briefcase, Users, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Navigation */}
      <nav className="w-full px-8 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg shadow-primary/20">
            ST
          </div>
          <span className="font-bold text-2xl tracking-tight text-foreground">Staff Tracker</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login/worker" className="px-6 py-2.5 rounded-full border border-primary/50 text-primary text-sm font-bold hover:bg-primary/10 transition-colors">
            Worker Login
          </Link>
          <Link href="/login/client" className="px-6 py-2.5 rounded-full border border-accent/50 text-accent text-sm font-bold hover:bg-accent/10 transition-colors">
            Client Login
          </Link>
          <Link href="/login/admin" className="px-6 py-2.5 rounded-full border border-secondary text-sm font-bold hover:bg-secondary/50 transition-colors">
            Admin Login
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 z-10 text-center -mt-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-bold mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Toronto's Premier Hospitality Network
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-tight">
            Connect. <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Staff.</span> Succeed.
          </h1>
          
          <p className="text-lg md:text-xl text-foreground/70 mb-12 max-w-2xl mx-auto leading-relaxed">
            The fastest, most reliable way to find verified hospitality shifts or hire elite staff in Toronto. No middleman, just seamless connections.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            
            {/* Worker Pathway */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative h-full p-8 rounded-3xl glass bg-background/60 border border-secondary text-left flex flex-col hover:border-primary/50 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold mb-2">I am a Worker</h3>
                <p className="text-foreground/70 mb-8 flex-1">
                  Find high-paying shifts across Toronto. Set your own schedule, get verified, and get paid fast.
                </p>
                <Link href="/signup/worker" className="flex items-center justify-between w-full px-6 py-4 bg-primary text-primary-foreground rounded-2xl font-bold hover:shadow-lg hover:shadow-primary/30 transition-all">
                  Apply for Shifts <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </motion.div>

            {/* Client Pathway */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-bl from-accent/20 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative h-full p-8 rounded-3xl glass bg-background/60 border border-secondary text-left flex flex-col hover:border-accent/50 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-6">
                  <Briefcase className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold mb-2">I am a Venue</h3>
                <p className="text-foreground/70 mb-8 flex-1">
                  Instantly access Toronto's largest pool of verified, pre-screened hospitality professionals.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link href="/signup/client" className="flex items-center justify-between w-full px-6 py-4 bg-secondary text-foreground rounded-2xl font-bold hover:bg-secondary/80 transition-all border border-secondary/50 hover:border-accent">
                    Register Venue <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link href="/login/client" className="flex items-center justify-between w-full px-6 py-4 bg-accent/10 text-accent rounded-2xl font-bold transition-all border border-accent/40 hover:bg-accent/20">
                    Client Login <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </motion.div>

          </div>
        </motion.div>

        {/* Feature Highlights */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="mt-24 flex flex-wrap justify-center gap-8 text-sm font-bold text-foreground/50"
        >
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Verified SmartServe</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Instant Matches</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Toronto Focused</span>
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> GPS Check-ins</span>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 text-center z-10 border-t border-secondary/30 mt-auto">
        <p className="text-sm font-bold text-foreground/40 tracking-widest uppercase">
          Powered by <span className="text-foreground/80">Ferrari</span>
        </p>
      </footer>
    </div>
  );
}
