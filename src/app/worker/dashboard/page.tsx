"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Clock, MapPin, CheckCircle2, 
  User, CreditCard, ChevronRight, LogOut,
  Bell, Briefcase, Star, Filter, ShieldCheck, Settings
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
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login/worker');
      return;
    }
    const user = JSON.parse(userStr);
    setWorker(user);

    const fetchData = async () => {
      try {
        const [shiftsRes, jobsRes] = await Promise.all([
          fetch('/api/shifts'),
          fetch('/api/jobs')
        ]);
        const sData = await shiftsRes.json();
        const jData = await jobsRes.json();
        
        setShifts(sData.filter((s: any) => s.workerId === user.id));
        setOpenJobs(jData.filter((j: any) => j.status === "Open"));
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
      alert(`Clocked in at ${new Date().toLocaleTimeString()} (GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
      
      await fetch('/api/shifts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...shift, status: "Active", actualCheckIn: new Date().toLocaleTimeString() })
      });
      window.location.reload();
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const upcomingShifts = shifts.filter(s => s.status === "Upcoming" || s.status === "Active");
  const completedShifts = shifts.filter(s => s.status === "Completed");
  const totalEarnings = completedShifts.reduce((acc, s) => acc + (s.hours * (s.rate || 25)), 0);

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-24 font-[family-name:var(--font-geist-sans)]">
      {/* Mobile Top Bar */}
      <div className="sticky top-0 z-40 glass border-b border-white/10 px-6 py-4 flex justify-between items-center bg-[#050505]/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            {worker?.name?.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold">{worker?.name}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Active Staff</p>
          </div>
        </div>
        <div className="flex gap-4">
          <Bell size={20} className="text-gray-400" />
          <button onClick={handleLogout}><LogOut size={20} className="text-gray-400" /></button>
        </div>
      </div>

      <main className="p-6 space-y-8 max-w-lg mx-auto">
        
        {activeTab === "shifts" && (
          <section className="space-y-8">
            {/* Earnings Quick View */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-xl shadow-emerald-500/20 relative overflow-hidden"
            >
              <div className="relative z-10">
                <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-1">Total Earnings</p>
                <h2 className="text-4xl font-black mb-4">${totalEarnings.toLocaleString()}</h2>
                <div className="flex items-center gap-2 text-xs font-bold bg-white/10 w-fit px-3 py-1.5 rounded-full backdrop-blur-md">
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
                  <Calendar size={20} className="text-emerald-400" /> Upcoming Shifts
                </h3>
                <span className="text-xs font-bold text-gray-500">{upcomingShifts.length} Assigned</span>
              </div>

              <div className="space-y-4">
                {upcomingShifts.length === 0 && (
                  <div className="py-12 text-center border border-dashed border-white/10 rounded-3xl bg-white/5">
                    <p className="text-gray-500 text-sm italic">No shifts assigned yet.</p>
                  </div>
                )}
                {upcomingShifts.map((shift) => (
                  <motion.div 
                    key={shift.id}
                    whileHover={{ scale: 1.02 }}
                    className="p-5 rounded-3xl bg-white/5 border border-white/10 flex flex-col gap-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg">{shift.role}</h4>
                        <p className="text-sm text-gray-400">{shift.venueName}</p>
                      </div>
                      <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-tighter">
                        {shift.status}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <Calendar size={14} className="text-emerald-400" /> {shift.date}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <Clock size={14} className="text-emerald-400" /> {shift.scheduledStart}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <button 
                        onClick={() => handleClockIn(shift)}
                        className="w-full py-3 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors"
                      >
                        {shift.status === "Active" ? "Already Active" : "Clock In"} <ChevronRight size={16} />
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
            <h3 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
              <Briefcase size={24} /> Available Jobs
            </h3>
            <div className="space-y-4">
              {openJobs.length === 0 && (
                <div className="py-12 text-center border border-dashed border-white/10 rounded-3xl bg-white/5">
                  <p className="text-gray-500 text-sm italic">No new jobs available right now.</p>
                </div>
              )}
              {openJobs.map((job) => (
                <motion.div 
                  key={job.id}
                  className="p-5 rounded-3xl bg-white/5 border border-white/10"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg">{job.role}</h4>
                      <p className="text-sm text-gray-400">{job.venueName} • ${job.hourlyRate}/hr</p>
                    </div>
                    {job.isUrgent && <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-black rounded uppercase">Urgent</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
                    <span className="flex items-center gap-1"><Calendar size={12}/> {job.date}</span>
                    <span className="flex items-center gap-1"><Clock size={12}/> {job.hours}h</span>
                  </div>
                  <button 
                    onClick={() => handleApply(job.id)}
                    className="w-full py-3 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 transition-colors"
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
            <h3 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
              <CreditCard size={24} /> Wallet & Earnings
            </h3>
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase">Available for Payout</p>
              <h4 className="text-4xl font-black">${totalEarnings.toLocaleString()}</h4>
              <button className="w-full py-3 bg-emerald-500 text-white font-black rounded-2xl opacity-50 cursor-not-allowed">
                Request Payout
              </button>
              <p className="text-[10px] text-gray-500 text-center italic">Payouts are processed every Friday.</p>
            </div>

            <div className="space-y-3">
              <h5 className="font-bold text-sm">Recent Activity</h5>
              {completedShifts.map(s => (
                <div key={s.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm">{s.role}</p>
                    <p className="text-[10px] text-gray-500">{s.date}</p>
                  </div>
                  <span className="font-bold text-emerald-400">+${(s.hours * (s.rate || 25)).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "profile" && (
          <section className="space-y-6">
             <h3 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
              <User size={24} /> My Profile
            </h3>
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-3xl font-black text-emerald-400">
                {worker?.name?.charAt(0)}
              </div>
              <div className="text-center">
                <h4 className="text-2xl font-bold">{worker?.name}</h4>
                <p className="text-gray-500 text-sm">{worker?.email}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-white/5 border border-white/10">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-4">Identity Verification</p>
                <div className="flex items-center gap-3 text-emerald-400">
                  <ShieldCheck size={20} />
                  <span className="font-bold text-sm">Documents Verified</span>
                </div>
              </div>
              <button className="w-full p-5 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between text-gray-400 hover:text-white transition-colors">
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
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-white/10 bg-[#050505]/80 p-4 flex justify-around items-center z-50">
        <button 
          onClick={() => setActiveTab("shifts")}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === "shifts" ? "text-emerald-400" : "text-gray-500"}`}
        >
          <Calendar size={24} />
          <span className="text-[10px] font-bold uppercase">Shifts</span>
        </button>
        <button 
          onClick={() => setActiveTab("jobs")}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === "jobs" ? "text-emerald-400" : "text-gray-500"}`}
        >
          <Briefcase size={24} />
          <span className="text-[10px] font-bold uppercase">Find Work</span>
        </button>
        <button 
          onClick={() => setActiveTab("wallet")}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === "wallet" ? "text-emerald-400" : "text-gray-500"}`}
        >
          <CreditCard size={24} />
          <span className="text-[10px] font-bold uppercase">Wallet</span>
        </button>
        <button 
          onClick={() => setActiveTab("profile")}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === "profile" ? "text-emerald-400" : "text-gray-500"}`}
        >
          <User size={24} />
          <span className="text-[10px] font-bold uppercase">Profile</span>
        </button>
      </nav>

      <style jsx>{`
        .glass {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
        }
      `}</style>
    </div>
  );
}
