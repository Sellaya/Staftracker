"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Clock, MapPin, CheckCircle2, 
  User, CreditCard, ChevronRight, LogOut,
  Bell, Briefcase, Star, Filter, ShieldCheck, Settings, Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function WorkerDashboard() {
  const router = useRouter();
  const [worker, setWorker] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [openJobs, setOpenJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"shifts" | "jobs" | "wallet" | "profile">("shifts");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const meRes = await fetch('/api/me', { cache: 'no-store' });
        if (!meRes.ok) {
          router.push('/login/worker');
          return;
        }
        const user = await meRes.json();
        if (user.role !== 'worker') {
          router.push('/login/worker');
          return;
        }
        localStorage.setItem('user', JSON.stringify(user));
        setWorker(user);
        const [shiftsRes, jobsRes] = await Promise.all([
          fetch('/api/shifts'),
          fetch('/api/jobs')
        ]);
        const sData = shiftsRes.ok ? await shiftsRes.json() : [];
        const jData = jobsRes.ok ? await jobsRes.json() : [];
        
        setShifts(Array.isArray(sData) ? sData.filter((s: any) => s.workerId === user.id) : []);
        setOpenJobs(Array.isArray(jData) ? jData.filter((j: any) => j.status === "Open") : []);
      } catch (e) {
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const handleApply = async (jobId: string) => {
    try {
      const res = await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, workerId: worker.id, workerName: worker.name })
      });
      if (res.ok) {
        alert("Application sent successfully!");
        setOpenJobs(openJobs.filter(j => j.id !== jobId));
      }
    } catch (e) {
      alert("Failed to apply");
    }
  };

  const handleClockIn = async (shift: any) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      
      await fetch('/api/shifts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...shift, 
          status: "Active", 
          actualCheckIn: new Date().toLocaleTimeString(),
          gpsStatus: latitude && longitude ? "Verified" : "Unavailable",
          gpsLatitude: latitude,
          gpsLongitude: longitude
        })
      });
      window.location.reload();
    }, () => {
      alert("Unable to verify location. Please enable geolocation and retry.");
    });
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  const upcomingShifts = shifts.filter(s => s.status === "Upcoming" || s.status === "Active");
  const completedShifts = shifts.filter(s => s.status === "Completed");
  const totalEarnings = completedShifts.reduce((acc, s) => acc + (parseFloat(s.hours || 0) * parseFloat(s.rate || 25)), 0);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 font-sans">
      {/* Mobile Top Bar */}
      <div className="sticky top-0 z-40 glass border-b border-secondary px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold">
            {worker?.name?.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold">{worker?.name}</p>
            <p className="text-[10px] text-foreground/50 uppercase tracking-widest">Active Staff</p>
          </div>
        </div>
        <div className="flex gap-4">
          <Bell size={20} className="text-foreground/40" />
          <button onClick={handleLogout}><LogOut size={20} className="text-foreground/40" /></button>
        </div>
      </div>

      <main className="p-6 space-y-8 max-w-lg mx-auto">
        
        {activeTab === "shifts" && (
          <section className="space-y-8">
            {/* Earnings Quick View */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden"
            >
              <div className="relative z-10">
                <p className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">Total Earnings</p>
                <h2 className="text-4xl font-black mb-4">${totalEarnings.toLocaleString()}</h2>
                <div className="flex items-center gap-2 text-xs font-bold bg-white/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-md">
                  <CheckCircle2 size={12} /> {completedShifts.length} Shifts Paid
                </div>
              </div>
              <div className="absolute top-0 right-0 p-8 opacity-20">
                <CreditCard size={100} className="rotate-12" />
              </div>
            </motion.div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Calendar size={20} className="text-primary" /> Upcoming Shifts
                </h3>
                <span className="text-xs font-bold text-foreground/50">{upcomingShifts.length} Assigned</span>
              </div>

              <div className="space-y-4">
                {upcomingShifts.length === 0 && (
                  <div className="py-12 text-center border border-dashed border-secondary rounded-3xl bg-secondary/5">
                    <p className="text-foreground/40 text-sm italic">No shifts assigned yet.</p>
                  </div>
                )}
                {upcomingShifts.map((shift) => (
                  <motion.div 
                    key={shift.id}
                    whileHover={{ scale: 1.01 }}
                    className="p-5 rounded-3xl bg-secondary/10 border border-secondary flex flex-col gap-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg">{shift.role}</h4>
                        <p className="text-sm text-foreground/50">{shift.venueName}</p>
                      </div>
                      <div className={`px-3 py-1 border rounded-full text-[10px] font-black uppercase tracking-tighter ${
                        shift.status === "Active" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-primary/10 border-primary/20 text-primary"
                      }`}>
                        {shift.status}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-xs text-foreground/70">
                        <Calendar size={14} className="text-primary" /> {shift.date}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-foreground/70">
                        <Clock size={14} className="text-primary" /> {shift.scheduledStart}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-secondary/20">
                      <button 
                        onClick={() => handleClockIn(shift)}
                        className={`w-full py-3 font-black rounded-2xl flex items-center justify-center gap-2 transition-colors ${
                          shift.status === "Active" ? "bg-emerald-500 text-white" : "bg-foreground text-background hover:bg-primary hover:text-primary-foreground"
                        }`}
                      >
                        {shift.status === "Active" ? "Active Now" : "Clock In"} <ChevronRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === "jobs" && (
          <section className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
              <Briefcase size={24} /> Available Jobs
            </h3>
            <div className="space-y-4">
              {openJobs.length === 0 && (
                <div className="py-12 text-center border border-dashed border-secondary rounded-3xl bg-secondary/5">
                  <p className="text-foreground/40 text-sm italic">No new jobs available right now.</p>
                </div>
              )}
              {openJobs.map((job) => (
                <motion.div 
                  key={job.id}
                  className="p-5 rounded-3xl bg-secondary/10 border border-secondary"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg">{job.role}</h4>
                      <p className="text-sm text-foreground/50">{job.venueName} • ${job.hourlyRate}/hr</p>
                    </div>
                    {job.isUrgent && <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-black rounded uppercase">Urgent</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-foreground/40 mb-6">
                    <span className="flex items-center gap-1"><Calendar size={12}/> {job.date}</span>
                    <span className="flex items-center gap-1"><Clock size={12}/> {job.hours}h</span>
                  </div>
                  <button 
                    onClick={() => handleApply(job.id)}
                    className="w-full py-3 bg-primary text-primary-foreground font-black rounded-2xl hover:bg-primary/90 transition-colors"
                  >
                    Apply Now
                  </button>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "wallet" && (
          <section className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
              <CreditCard size={24} /> Wallet & Earnings
            </h3>
            <div className="p-6 rounded-3xl bg-secondary/10 border border-secondary space-y-4">
              <p className="text-xs font-bold text-foreground/50 uppercase">Available for Payout</p>
              <h4 className="text-4xl font-black">${totalEarnings.toLocaleString()}</h4>
              <button className="w-full py-3 bg-primary text-primary-foreground font-black rounded-2xl opacity-50 cursor-not-allowed">
                Request Payout
              </button>
              <p className="text-[10px] text-foreground/40 text-center italic">Payouts are processed every Friday.</p>
            </div>

            <div className="space-y-3">
              <h5 className="font-bold text-sm">Recent Activity</h5>
              {completedShifts.map(s => (
                <div key={s.id} className="p-4 rounded-2xl bg-secondary/10 border border-secondary flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm">{s.role}</p>
                    <p className="text-[10px] text-foreground/50">{s.date}</p>
                  </div>
                  <span className="font-bold text-primary">+${(parseFloat(s.hours || 0) * parseFloat(s.rate || 25)).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "profile" && (
          <section className="space-y-6">
             <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
              <User size={24} /> My Profile
            </h3>
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-24 h-24 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-3xl font-black text-primary">
                {worker?.name?.charAt(0)}
              </div>
              <div className="text-center">
                <h4 className="text-2xl font-bold">{worker?.name}</h4>
                <p className="text-foreground/50 text-sm">{worker?.email}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-secondary/10 border border-secondary">
                <p className="text-xs text-foreground/50 font-bold uppercase tracking-widest mb-4">Identity Verification</p>
                <div className="flex items-center gap-3 text-emerald-500">
                  <ShieldCheck size={20} />
                  <span className="font-bold text-sm">Documents Verified</span>
                </div>
              </div>
              <button className="w-full p-5 rounded-3xl bg-secondary/10 border border-secondary flex items-center justify-between text-foreground/50 hover:text-foreground transition-colors">
                <div className="flex items-center gap-3">
                  <Settings size={20} />
                  <span className="font-bold text-sm">Settings</span>
                </div>
                <ChevronRight size={16} />
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-secondary p-4 flex justify-around items-center z-50">
        <button 
          onClick={() => setActiveTab("shifts")}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === "shifts" ? "text-primary" : "text-foreground/40"}`}
        >
          <Calendar size={24} />
          <span className="text-[10px] font-bold uppercase">Shifts</span>
        </button>
        <button 
          onClick={() => setActiveTab("jobs")}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === "jobs" ? "text-primary" : "text-foreground/40"}`}
        >
          <Briefcase size={24} />
          <span className="text-[10px] font-bold uppercase">Find Work</span>
        </button>
        <button 
          onClick={() => setActiveTab("wallet")}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === "wallet" ? "text-primary" : "text-foreground/40"}`}
        >
          <CreditCard size={24} />
          <span className="text-[10px] font-bold uppercase">Wallet</span>
        </button>
        <button 
          onClick={() => setActiveTab("profile")}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === "profile" ? "text-primary" : "text-foreground/40"}`}
        >
          <User size={24} />
          <span className="text-[10px] font-bold uppercase">Profile</span>
        </button>
      </nav>
    </div>
  );
}
