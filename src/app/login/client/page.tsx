"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, Building2 } from "lucide-react";
import Link from "next/link";

export default function ClientLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Invalid credentials");
        return;
      }

      const user = await res.json();
      if (user?.role !== "user") {
        await fetch("/api/logout", { method: "POST" });
        setError("This login is for client accounts only.");
        return;
      }

      localStorage.setItem("user", JSON.stringify(user));
      router.push("/dashboard");
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-primary mb-6 shadow-xl shadow-accent/20">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Client Portal</h1>
          <p className="text-foreground/50 font-medium">Sign in to post jobs and manage your venues.</p>
        </div>

        <div className="glass border border-secondary p-8 rounded-3xl shadow-2xl bg-background/40 backdrop-blur-xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl flex items-center gap-3 text-sm font-bold"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground/70 ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-accent transition-colors">
                  <Mail className="w-5 h-5 text-foreground/30 group-focus-within:text-accent" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-secondary/20 border border-secondary py-3.5 pl-12 pr-4 rounded-2xl outline-none focus:border-accent focus:bg-background/80 transition-all font-medium"
                  placeholder="manager@company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground/70 ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-accent transition-colors">
                  <Lock className="w-5 h-5 text-foreground/30 group-focus-within:text-accent" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-secondary/20 border border-secondary py-3.5 pl-12 pr-4 rounded-2xl outline-none focus:border-accent focus:bg-background/80 transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent text-background py-4 rounded-2xl font-black text-lg shadow-xl shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:translate-y-0"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Access Client Dashboard
                  <ArrowRight className="w-6 h-6" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 flex justify-center gap-4 text-xs font-bold">
          <Link href="/signup/client" className="text-accent hover:underline">
            Create Client Account
          </Link>
          <Link href="/" className="text-foreground/50 hover:text-foreground transition-colors">
            Back to Public Site
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
