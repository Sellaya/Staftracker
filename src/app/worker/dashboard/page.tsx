"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Calendar, Clock, CheckCircle2,
  User, CreditCard, ChevronRight, LogOut,
  Bell, Briefcase, ShieldCheck, Settings, Loader2, FileText
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function WorkerDashboard() {
  const router = useRouter();
  const [worker, setWorker] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [openJobs, setOpenJobs] = useState<any[]>([]);
  const [jobActionMessage, setJobActionMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [applyBusyId, setApplyBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"shifts" | "jobs" | "wallet" | "profile">("shifts");

  const fetchDashboardData = async (user: any) => {
    const [shiftsRes, jobsRes] = await Promise.all([
      fetch('/api/shifts'),
      fetch('/api/jobs')
    ]);
    const sData = shiftsRes.ok ? await shiftsRes.json() : [];
    const jData = jobsRes.ok ? await jobsRes.json() : [];

    setShifts(Array.isArray(sData) ? sData.filter((s: any) => s.workerId === user.id) : []);
    const open = Array.isArray(jData) ? jData.filter((j: any) => j.status === "Open") : [];
    setOpenJobs(
      open.map((j: any) => ({
        ...j,
        _myApplication: Array.isArray(j.applicants)
          ? j.applicants.find((a: any) => a.id === user.id)
          : null,
      }))
    );
  };

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
        await fetchDashboardData(user);
      } catch (e) {
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const handleApply = async (jobId: string) => {
    if (!worker) return;
    setJobActionMessage(null);
    setApplyBusyId(jobId);
    try {
      const res = await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, workerId: worker.id, workerName: worker.name })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setJobActionMessage({
          type: "ok",
          text:
            data.message === "Already applied"
              ? "You are already on the admin review list for that shift."
              : "Application sent. Wait for admin confirmation before it appears in Upcoming Shifts.",
        });
        await fetchDashboardData(worker);
        return;
      }
      setJobActionMessage({ type: "err", text: data.error || "Could not apply." });
    } catch {
      setJobActionMessage({ type: "err", text: "Failed to apply." });
    } finally {
      setApplyBusyId(null);
    }
  };

  const handleClockIn = async (shift: any) => {
    if (!worker) return;
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;

      const res = await fetch('/api/shifts/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'worker_check_in',
          shiftId: shift.id,
          actualCheckIn: new Date().toLocaleTimeString(),
          gpsStatus: latitude && longitude ? "Verified" : "Unavailable",
          gpsLatitude: latitude,
          gpsLongitude: longitude
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Unable to check in.");
        return;
      }
      await fetchDashboardData(worker);
    }, () => {
      alert("Unable to verify location. Please enable geolocation and retry.");
    });
  };

  const handleClockOut = async (shift: any) => {
    if (!worker) return;
    const res = await fetch('/api/shifts/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'worker_check_out',
        shiftId: shift.id,
        actualCheckOut: new Date().toLocaleTimeString()
      })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Unable to check out.");
      return;
    }
    await fetchDashboardData(worker);
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
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded border ${
                        shift.paymentStatus === "paid"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : shift.paymentStatus === "finalized"
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            : "bg-secondary text-foreground/60 border-secondary"
                      }`}>
                        Pay: {shift.paymentStatus || "pending"}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded border ${
                        shift.invoiceStatus === "invoiced"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-secondary text-foreground/60 border-secondary"
                      }`}>
                        Invoice: {shift.invoiceStatus || "pending"}
                      </span>
                      {shift.timesheetId && (
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded border bg-blue-500/10 text-blue-500 border-blue-500/20">
                          Timesheet Ready
                        </span>
                      )}
                    </div>

                    <div className="pt-4 border-t border-secondary/20">
                      {shift.status === "Active" ? (
                        <button
                          onClick={() => handleClockOut(shift)}
                          className="w-full py-3 font-black rounded-2xl flex items-center justify-center gap-2 transition-colors bg-emerald-500 text-white hover:bg-emerald-600"
                        >
                          Clock Out <ChevronRight size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleClockIn(shift)}
                          className="w-full py-3 font-black rounded-2xl flex items-center justify-center gap-2 transition-colors bg-foreground text-background hover:bg-primary hover:text-primary-foreground"
                        >
                          Clock In <ChevronRight size={16} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FileText size={20} className="text-primary" /> Completed & Review
                </h3>
                <span className="text-xs font-bold text-foreground/50">{completedShifts.length} Completed</span>
              </div>
              {completedShifts.slice(0, 5).map((shift) => (
                <div key={shift.id} className="p-4 rounded-2xl bg-secondary/10 border border-secondary space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm">{shift.role}</p>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border bg-blue-500/10 text-blue-500 border-blue-500/20">
                      Completed
                    </span>
                  </div>
                  <p className="text-xs text-foreground/50">{shift.date} • {shift.venueName}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded border ${
                      shift.isApproved ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-secondary text-foreground/60 border-secondary"
                    }`}>
                      {shift.isApproved ? "Approved" : "Approval Pending"}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded border ${
                      shift.paymentStatus === "paid"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : shift.paymentStatus === "finalized"
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          : "bg-secondary text-foreground/60 border-secondary"
                    }`}>
                      Pay: {shift.paymentStatus || "pending"}
                    </span>
                  </div>
                </div>
              ))}
              {completedShifts.length === 0 && (
                <div className="py-8 text-center border border-dashed border-secondary rounded-2xl bg-secondary/5">
                  <p className="text-foreground/40 text-sm italic">Completed shifts will appear here with approval and payout states.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "jobs" && (
          <section className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
              <Briefcase size={24} /> Available Jobs
            </h3>
            {jobActionMessage && (
              <div
                className={`p-3 rounded-2xl text-sm font-semibold border ${
                  jobActionMessage.type === "ok"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-red-500/30 bg-red-500/10 text-red-600"
                }`}
              >
                {jobActionMessage.text}
              </div>
            )}
            <p className="text-xs text-foreground/50">
              Use Open Shifts Hub to review full site instructions before applying. Quick apply here still uses the same admin confirmation flow.
            </p>
            <div className="space-y-4">
              {openJobs.length === 0 && (
                <div className="py-12 text-center border border-dashed border-secondary rounded-3xl bg-secondary/5">
                  <p className="text-foreground/40 text-sm italic">No new jobs available right now.</p>
                </div>
              )}
              {openJobs.map((job) => {
                const st = job._myApplication?.status || (job._myApplication ? "pending_admin" : null);
                const pending = st === "pending_admin";
                const rejected = st === "rejected";
                const withdrawn = st === "withdrawn";
                return (
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
                  <div className="flex items-center gap-4 text-xs text-foreground/40 mb-4">
                    <span className="flex items-center gap-1"><Calendar size={12}/> {job.date}</span>
                    <span className="flex items-center gap-1"><Clock size={12}/> {job.hours}h</span>
                  </div>
                  {pending && (
                    <div className="mb-3 text-xs font-bold text-amber-600 border border-amber-500/25 bg-amber-500/10 rounded-xl px-3 py-2">
                      Awaiting admin confirmation
                    </div>
                  )}
                  {rejected && (
                    <div className="mb-3 text-xs text-red-600 border border-red-500/20 bg-red-500/5 rounded-xl px-3 py-2">
                      Not selected{job._myApplication?.rejectionReason ? `: ${job._myApplication.rejectionReason}` : "."}
                    </div>
                  )}
                  {withdrawn && (
                    <div className="mb-3 text-xs text-foreground/60 border border-secondary rounded-xl px-3 py-2">
                      You withdrew your application.
                    </div>
                  )}
                  <button 
                    type="button"
                    onClick={() => handleApply(job.id)}
                    disabled={pending || applyBusyId === job.id}
                    className="w-full py-3 bg-primary text-primary-foreground font-black rounded-2xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {applyBusyId === job.id ? <Loader2 size={18} className="animate-spin" /> : null}
                    {pending ? "On admin review" : "Apply Now"}
                  </button>
                </motion.div>
                );
              })}
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
