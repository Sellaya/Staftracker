"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, UserCircle2, KeyRound } from "lucide-react";

import { useRouter } from "next/navigation";

export default function WorkerLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const user = await res.json();
        localStorage.setItem("currentUser", JSON.stringify(user));
        router.push("/worker/dashboard");
      } else {
        const data = await res.json();
        alert(data.error || "Login failed");
      }
    } catch (err) {
      alert("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Navigation */}
      <nav className="w-full px-8 py-6 flex justify-between items-center z-10 relative">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-black text-sm">
            ST
          </div>
          <span className="font-bold tracking-tight text-foreground">Staff Tracker</span>
        </Link>
        <Link href="/" className="text-sm font-bold text-foreground/50 hover:text-foreground flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-4 z-10 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
              <UserCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Worker Portal</h1>
            <p className="text-foreground/70">Welcome back. Log in to claim shifts.</p>
          </div>

          <form onSubmit={handleLogin} className="p-8 glass bg-background/60 border border-secondary rounded-3xl shadow-2xl">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-foreground/70 mb-2">EMAIL ADDRESS</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com" 
                  className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors" 
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-foreground/70">PASSWORD</label>
                  <a href="#" className="text-xs font-bold text-primary hover:underline">Forgot password?</a>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full pl-10 pr-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors" 
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full mt-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50"
            >
              {isLoading ? "Authenticating..." : "Log In"}
            </button>

            <p className="text-center text-sm text-foreground/70 mt-6">
              Don't have an account? <Link href="/signup/worker" className="text-primary font-bold hover:underline">Apply here</Link>
            </p>
          </form>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center border-t border-secondary/30 mt-auto relative z-10">
        <p className="text-xs font-bold text-foreground/40 tracking-widest uppercase">
          Powered by <span className="text-foreground/80">Ferrari</span>
        </p>
      </footer>
    </div>
  );
}
