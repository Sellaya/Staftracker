"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CalendarDays, MapPin, Clock, 
  ShieldCheck, AlertCircle, CheckCircle2,
  X, Briefcase, Car, FileText, XCircle
} from "lucide-react";
import Link from "next/link";

export default function WorkerDashboard() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [gpsMock, setGpsMock] = useState(false);
  const [assignedShifts, setAssignedShifts] = useState<any[]>([]);
  const [selectedShift, setSelectedShift] = useState<any | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch('/api/jobs', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          // Filter for jobs explicitly assigned to this worker
          const currentUserStr = localStorage.getItem("currentUser");
          const workerId = currentUserStr ? JSON.parse(currentUserStr).id : "W-2001";
          const myShifts = data.filter((j: any) => j.assignedWorkerId === workerId && j.status === "Filled");
          
          // Sort by date (in a real app we'd parse properly, but simple string sort works for YYYY-MM-DD)
          myShifts.sort((a: any, b: any) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());
          
          setAssignedShifts(myShifts);
        }
      } catch (err) {
        console.error("Failed to fetch assigned jobs");
      }
    };
    fetchJobs();
  }, []);

  const handleCheckIn = () => {
    setGpsMock(true);
    setTimeout(() => {
      setGpsMock(false);
      setCheckedIn(true);
    }, 2000);
  };

  const handleCancelShift = async () => {
    if (!selectedShift) return;
    
    // Optimistic local UI update
    setAssignedShifts(assignedShifts.filter(s => s.id !== selectedShift.id));
    const targetId = selectedShift.id;
    setSelectedShift(null);

    try {
      const res = await fetch('/api/jobs', { cache: 'no-store' });
      if (res.ok) {
        const allJobs = await res.json();
        const targetJob = allJobs.find((j: any) => j.id === targetId);
        
        if (targetJob) {
          targetJob.status = "Open";
          targetJob.assignedWorkerId = null;
          targetJob.assignedWorkerName = null;
          if (targetJob.applicants) {
            const currentUserStr = localStorage.getItem("currentUser");
            const workerId = currentUserStr ? JSON.parse(currentUserStr).id : "W-2001";
            targetJob.applicants = targetJob.applicants.filter((a: any) => a.id !== workerId);
          }
          
          await fetch('/api/jobs', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(targetJob)
          });
        }
      }
    } catch (err) {
      console.error("Failed to cancel shift");
    }
  };

  const nextShift = assignedShifts.length > 0 ? assignedShifts[0] : null;
  const upcomingShifts = assignedShifts.slice(1);

  const formatMonth = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  };
  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString('en-US', { day: '2-digit' });
  };
  const formatFullDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "--:--";
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
      
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, Alex!</h1>
          <p className="text-foreground/70 mt-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Account Active & Verified
          </p>
        </div>
        <div className="p-4 rounded-xl border border-secondary bg-background glass flex items-center gap-4 shadow-sm">
          <div>
            <p className="text-xs font-bold text-foreground/50">EST. THIS WEEK</p>
            <p className="text-2xl font-black text-emerald-500">
              ${assignedShifts.reduce((total, shift) => total + (shift.hours * shift.hourlyRate), 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Next Shift Banner */}
      {nextShift ? (
        <motion.div 
          onClick={() => setSelectedShift(nextShift)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 md:p-8 rounded-3xl bg-primary text-primary-foreground shadow-2xl shadow-primary/20 relative overflow-hidden cursor-pointer hover:shadow-primary/40 transition-shadow"
        >
          <div className="absolute top-[-50%] right-[-10%] w-[60%] h-[200%] bg-white/10 blur-3xl rounded-full mix-blend-overlay pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-wider mb-4 border border-white/20 backdrop-blur-md">
                Your Next Shift
              </span>
              <h2 className="text-3xl font-black mb-2">{nextShift.role}</h2>
              <p className="text-primary-foreground/80 flex items-center gap-2 font-medium">
                <MapPin className="w-5 h-5" /> {nextShift.venueName}
              </p>
            </div>
            
            <div className="flex flex-col gap-3 bg-black/20 p-5 rounded-2xl border border-white/10 w-full md:w-auto min-w-[280px]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <CalendarDays className="w-5 h-5 text-primary-foreground/70" />
                <span className="font-bold">{formatFullDate(nextShift.date)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary-foreground/70" />
                <span className="font-bold">{formatTime(nextShift.startTime)} - {formatTime(nextShift.endTime)} ({nextShift.hours} hrs)</span>
              </div>
              
              {checkedIn ? (
                <div className="mt-2 w-full py-2.5 bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
                  <CheckCircle2 className="w-5 h-5" /> Checked In
                </div>
              ) : (
                <button 
                  onClick={handleCheckIn}
                  disabled={gpsMock}
                  className="mt-2 w-full py-2.5 bg-white text-primary rounded-xl font-bold hover:bg-white/90 transition-colors shadow-lg shadow-black/20 disabled:opacity-80 flex items-center justify-center gap-2"
                >
                  {gpsMock ? (
                    <>
                      <MapPin className="w-4 h-4 animate-bounce" /> Verifying Location...
                    </>
                  ) : (
                    "Check In via GPS"
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="p-8 rounded-3xl border border-dashed border-secondary bg-secondary/5 text-center flex flex-col items-center justify-center space-y-4">
          <CalendarDays className="w-12 h-12 text-foreground/30" />
          <div>
            <h3 className="text-xl font-bold mb-1">No Upcoming Shifts</h3>
            <p className="text-foreground/50">You don't have any shifts scheduled. Check the marketplace to pick up some hours!</p>
          </div>
          <Link href="/worker/shifts" className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold mt-2 hover:bg-primary/90 transition-colors">
            Find Shifts
          </Link>
        </div>
      )}

      {/* Upcoming Shifts List */}
      {upcomingShifts.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            Future Schedule
          </h3>
          
          <div className="space-y-4">
            {upcomingShifts.map((shift, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedShift(shift)}
                className="p-5 rounded-2xl border border-secondary bg-background/50 glass flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-primary/50 hover:shadow-lg transition-all group cursor-pointer"
              >
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 rounded-xl bg-secondary/30 flex flex-col items-center justify-center border border-secondary">
                    <span className="text-xs font-bold text-foreground/50">{formatMonth(shift.date)}</span>
                    <span className="text-xl font-black text-foreground">{formatDay(shift.date)}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{shift.role}</h4>
                    <p className="text-sm text-foreground/70 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" /> {shift.venueName}
                    </p>
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto">
                  <span className="font-bold text-sm bg-secondary px-3 py-1 rounded-lg">
                    {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                  </span>
                  <p className="text-emerald-500 font-bold text-sm sm:mt-2">${(shift.hours * shift.hourlyRate).toFixed(2)} Est. Pay</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!nextShift && upcomingShifts.length === 0) ? null : (
        <Link href="/worker/shifts" className="block w-full text-center mt-4 py-4 rounded-xl border border-dashed border-secondary text-sm font-bold text-foreground/50 hover:bg-secondary/10 hover:text-foreground transition-colors">
          Browse Open Shifts Hub
        </Link>
      )}

      {/* Important Notices */}
      <div>
        <h3 className="text-xl font-bold mb-4">Action Required</h3>
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-amber-500">SmartServe Expiring Soon</h4>
            <p className="text-sm text-amber-500/80 mt-1">Your SmartServe certification on file expires in 30 days. Please upload a renewed certification to continue picking up Bartender and Server shifts.</p>
            <Link href="/worker/profile" className="inline-block mt-3 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-colors">
              Upload New Document
            </Link>
          </div>
        </div>
      </div>


      {/* Shift Details Modal */}
      <AnimatePresence>
        {selectedShift && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedShift(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-background border border-secondary shadow-2xl rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-secondary flex justify-between items-center bg-secondary/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedShift.role}</h2>
                    <p className="text-sm text-foreground/50">{selectedShift.venueName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedShift(null)}
                  className="p-2 bg-secondary/20 hover:bg-secondary/40 text-foreground/70 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto hide-scrollbar space-y-6">
                
                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-secondary/10 border border-secondary">
                    <p className="text-xs font-bold text-foreground/50 mb-1 flex items-center gap-1"><CalendarDays className="w-3 h-3"/> DATE</p>
                    <p className="font-bold">{formatFullDate(selectedShift.date)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/10 border border-secondary">
                    <p className="text-xs font-bold text-foreground/50 mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> TIME</p>
                    <p className="font-bold">{formatTime(selectedShift.startTime)} - {formatTime(selectedShift.endTime)}</p>
                  </div>
                </div>

                {/* Details Sections */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-foreground/50 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> INSTRUCTIONS
                    </h3>
                    <div className="p-4 rounded-xl border border-secondary bg-background text-sm leading-relaxed">
                      {selectedShift.instructions || "No specific instructions provided."}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-foreground/50 mb-2 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" /> UNIFORM
                    </h3>
                    <div className="p-4 rounded-xl border border-secondary bg-background text-sm leading-relaxed">
                      {selectedShift.uniform || "Standard uniform required."}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-foreground/50 mb-2 flex items-center gap-2">
                      <Car className="w-4 h-4" /> PARKING
                    </h3>
                    <div className="p-4 rounded-xl border border-secondary bg-background text-sm leading-relaxed">
                      {selectedShift.parking || "Parking information not provided."}
                    </div>
                  </div>
                </div>

                {/* Cancel Shift Option */}
                <div className="pt-6 border-t border-secondary mt-6">
                  <button 
                    onClick={handleCancelShift}
                    className="w-full py-3 flex items-center justify-center gap-2 text-red-500 font-bold bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Request Shift Cancellation
                  </button>
                  <p className="text-center text-xs text-foreground/40 mt-2">
                    Canceling within 24 hours affects your reliability score.
                  </p>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
