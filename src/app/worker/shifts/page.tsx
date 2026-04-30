"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, MapPin, CalendarDays, Clock, DollarSign,
  Filter, CheckCircle2, ChevronRight, Briefcase, XCircle
} from "lucide-react";
import { useEffect } from "react";

type OpenShift = {
  id: string;
  role: string;
  venue: string;
  address: string;
  date: string;
  time: string;
  hours: number;
  rate: number;
  urgent: boolean;
  applied: boolean;
};

const MOCK_SHIFTS: OpenShift[] = [
  {
    id: "S-101",
    role: "Lead Bartender",
    venue: "The Rustic Table",
    address: "123 King St W",
    date: "Tomorrow, Oct 30",
    time: "8:00 PM - 2:00 AM",
    hours: 6,
    rate: 30,
    urgent: true,
    applied: false
  },
  {
    id: "S-102",
    role: "Line Cook",
    venue: "Liberty Grand",
    address: "25 British Columbia Rd",
    date: "Friday, Nov 1",
    time: "4:00 PM - 12:00 AM",
    hours: 8,
    rate: 22,
    urgent: false,
    applied: true
  },
  {
    id: "S-103",
    role: "Event Server",
    venue: "Downtown Events Co.",
    address: "Multiple Locations",
    date: "Saturday, Nov 2",
    time: "5:00 PM - 1:00 AM",
    hours: 8,
    rate: 25,
    urgent: false,
    applied: false
  },
  {
    id: "S-104",
    role: "Dishwasher",
    venue: "The Rustic Table (Midtown)",
    address: "2400 Yonge St",
    date: "Saturday, Nov 2",
    time: "6:00 PM - 2:00 AM",
    hours: 8,
    rate: 20,
    urgent: true,
    applied: false
  }
];

export default function WorkerOpenShifts() {
  const [shifts, setShifts] = useState<OpenShift[]>(MOCK_SHIFTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "--:--";
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const getWorkerFromStorage = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return null;
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const fetchLiveJobs = async () => {
      try {
        const res = await fetch('/api/jobs', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          // Map Admin JobPost to Worker OpenShift format
          const liveShifts: OpenShift[] = data
            .filter((dbJob: any) => dbJob.status === "Open")
            .map((dbJob: any) => ({
              id: dbJob.id,
              role: dbJob.role,
              venue: dbJob.venueName,
              address: dbJob.parking || "Address Not Provided",
              date: dbJob.date,
              time: `${formatTime(dbJob.startTime)} - ${formatTime(dbJob.endTime)}`,
              hours: dbJob.hours,
              rate: dbJob.hourlyRate,
              urgent: dbJob.isUrgent,
              applied: dbJob.applicants?.some((a: any) => {
                const workerId = getWorkerFromStorage()?.id;
                return a.id === workerId;
              }) || false
            }));
          setShifts(liveShifts);
        }
      } catch (err) {
        console.error("Failed to fetch live jobs");
      }
    };
    fetchLiveJobs();
  }, []);

  const handleApply = async (id: string) => {
    // Update local UI immediately
    setShifts((prev) => prev.map(s => s.id === id ? { ...s, applied: true } : s));

    try {
      // Fetch the full job data
      const res = await fetch('/api/jobs', { cache: 'no-store' });
      if (res.ok) {
        const allJobs = await res.json();
        const targetJob = allJobs.find((j: any) => j.id === id);
        
        if (targetJob) {
          // Add this worker to the applicants list
          const workerUser = getWorkerFromStorage();
          const newApplicant = {
            id: workerUser ? workerUser.id : "unknown-worker",
            name: workerUser ? `${workerUser.firstName} ${workerUser.lastName}` : "Alex (You)",
            reliability: 100,
            appliedAt: "Just now"
          };
          
          targetJob.applicants = targetJob.applicants || [];
          // Avoid duplicate applications
          if (!targetJob.applicants.find((a: any) => a.id === newApplicant.id)) {
            targetJob.applicants.push(newApplicant);
          }

          // Save back to the database
          await fetch('/api/jobs/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: id, workerId: newApplicant.id, workerName: newApplicant.name })
          });
        }
      }
    } catch (err) {
      console.error("Failed to update job application", err);
    }
  };

  const handleCancelApplication = async (id: string) => {
    // Update local UI immediately
    setShifts((prev) => prev.map(s => s.id === id ? { ...s, applied: false } : s));

    try {
      // Fetch the full job data
      const res = await fetch('/api/jobs', { cache: 'no-store' });
      if (res.ok) {
        const allJobs = await res.json();
        const targetJob = allJobs.find((j: any) => j.id === id);
        
        if (targetJob && targetJob.applicants) {
          // Remove this worker from the applicants list
          const workerId = getWorkerFromStorage()?.id;
          targetJob.applicants = targetJob.applicants.filter((a: any) => a.id !== workerId);

          // Save back to the database
          await fetch('/api/jobs', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(targetJob)
          });
        }
      }
    } catch (err) {
      console.error("Failed to cancel job application", err);
    }
  };

  const filteredShifts = shifts.filter(s => {
    const matchesSearch = s.role.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.venue.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filter === "Urgent") return s.urgent;
    if (filter === "Applied") return s.applied;
    return true;
  });

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Open Shifts Hub</h1>
          <p className="text-foreground/70 mt-1">Browse and claim available shifts across Toronto.</p>
        </div>
      </div>

      <div className="glass rounded-2xl bg-background/50 border border-secondary flex flex-col overflow-hidden p-4 gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roles or venues..." 
            className="w-full pl-10 pr-4 py-2 bg-background border border-secondary rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto hide-scrollbar">
          {["All", "Urgent", "Applied"].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "border border-secondary hover:bg-secondary/50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence>
          {filteredShifts.map((shift) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={shift.id} 
              className={`p-6 rounded-2xl border bg-background/80 glass flex flex-col justify-between ${
                shift.applied ? "border-emerald-500/30 shadow-lg shadow-emerald-500/10" : 
                shift.urgent ? "border-amber-500/30 shadow-lg shadow-amber-500/10" : "border-secondary"
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${shift.applied ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"}`}>
                      <Briefcase className="w-5 h-5" />
                    </div>
                    {shift.urgent && !shift.applied && (
                      <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-wider rounded border border-amber-500/20">
                        Urgent
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-emerald-500">${shift.rate}<span className="text-sm font-bold text-foreground/50">/hr</span></p>
                    <p className="text-xs font-bold text-foreground/50">Est. ${(shift.rate * shift.hours).toFixed(2)}</p>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-1">{shift.role}</h3>
                <p className="text-sm text-foreground/70 font-medium mb-4">{shift.venue}</p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-foreground/70">
                    <CalendarDays className="w-4 h-4" /> {shift.date}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground/70">
                    <Clock className="w-4 h-4" /> {shift.time} ({shift.hours} hrs)
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground/70">
                    <MapPin className="w-4 h-4" /> {shift.address}
                  </div>
                </div>
              </div>

              {shift.applied ? (
                <button 
                  onClick={() => handleCancelApplication(shift.id)}
                  className="w-full py-3 bg-emerald-500/10 hover:bg-red-500/10 text-emerald-500 hover:text-red-500 hover:border-red-500/20 border border-emerald-500/20 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors group"
                >
                  <CheckCircle2 className="w-5 h-5 group-hover:hidden" /> 
                  <XCircle className="w-5 h-5 hidden group-hover:block" /> 
                  <span className="group-hover:hidden">Application Sent</span>
                  <span className="hidden group-hover:block">Cancel Application</span>
                </button>
              ) : (
                <button 
                  onClick={() => handleApply(shift.id)}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  Apply for Shift <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredShifts.length === 0 && (
          <div className="col-span-full py-12 text-center text-foreground/50 border border-dashed border-secondary rounded-2xl bg-secondary/5">
            No open shifts match your search.
          </div>
        )}
      </div>

    </div>
  );
}
