"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Lock, ArrowRight, Star, ShieldCheck, Briefcase } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function WorkerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const user = await res.json();
        localStorage.setItem('user', JSON.stringify(user));
        router.push('/worker/dashboard');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Invalid worker credentials");
      }
    } catch {
      alert("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full" />

      <div className="w-full max-w-md relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 mb-4 text-primary">
            <Briefcase size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Worker Portal</h1>
          <p className="text-foreground/60">View your schedule, clock in, and track earnings.</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass p-8 rounded-3xl border border-secondary shadow-2xl relative overflow-hidden"
        >
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest ml-1">Work Email</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30 group-focus-within:text-primary transition-colors">
                  <User size={18} />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-secondary/10 border border-secondary rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Password</label>
                <button type="button" className="text-xs font-bold text-primary hover:underline">Forgot?</button>
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30 group-focus-within:text-primary transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-secondary/10 border border-secondary rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black py-4 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 group transition-all disabled:opacity-50"
            >
              {isLoading ? "Authenticating..." : "Access My Shifts"}
              {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-secondary"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-foreground/40 font-bold tracking-widest">New to StaffTracker?</span></div>
            </div>

            <Link href="/signup/worker" className="w-full bg-secondary/20 hover:bg-secondary/30 text-foreground font-bold py-4 rounded-2xl border border-secondary transition-all block text-center">
              Apply to Join the Team
            </Link>
          </form>
        </motion.div>

        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex justify-center text-primary mb-1"><Star size={16} /></div>
            <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-tighter">Top Rated</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-center text-primary mb-1"><ShieldCheck size={16} /></div>
            <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-tighter">Vetted</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-center text-primary mb-1"><Briefcase size={16} /></div>
            <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-tighter">Fast Pay</p>
          </div>
        </div>

        <p className="mt-12 text-center text-foreground/40 text-xs font-medium">
          <Link href="/" className="hover:text-foreground transition-colors">← Back to Landing Page</Link>
        </p>
      </div>
    </div>
  );
}
