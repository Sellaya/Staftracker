"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Briefcase, Search, Plus, MapPin, CalendarDays, Clock, 
  DollarSign, AlertCircle, X, Users, CheckCircle2, Star, Edit3, Check, Navigation, Shirt, Car,
  ChevronLeft, ChevronRight, XCircle
} from "lucide-react";

// Types
type JobStatus = "Open" | "Filled" | "Cancelled";

type Applicant = {
  id: string;
  name: string;
  rating: number;
  reliability: number;
  appliedAt: string;
};

type JobPost = {
  id: string;
  clientId: string;
  clientName: string;
  venueName: string;
  role: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  hours: number;
  hourlyRate: number;
  status: JobStatus;
  isUrgent: boolean;
  instructions: string;
  uniform: string;
  parking: string;
  applicants: Applicant[];
  assignedWorkerId: string | null;
  assignedWorkerName: string | null;
};

// Utilities for formatting
const formatDate = (dateStr: string) => {
  if (!dateStr) return "Select Date";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return "--:--";
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const calculateHours = (start: string, end: string) => {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  let diffH = endH - startH;
  let diffM = endM - startM;
  if (diffM < 0) { diffH -= 1; diffM += 60; }
  if (diffH < 0) { diffH += 24; } // overnight shift
  return Number((diffH + diffM / 60).toFixed(1));
};

// ==========================================
// CUSTOM PREMIUM PICKERS
// ==========================================

function CustomDatePicker({ value, onChange, label }: { value: string, onChange: (v: string) => void, label: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    return value ? new Date(value + "T00:00:00") : new Date();
  });

  // Keep viewDate in sync with value when opened
  useEffect(() => {
    if (isOpen) {
      setViewDate(value ? new Date(value + "T00:00:00") : new Date());
    }
  }, [isOpen, value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const days = Array.from({length: daysInMonth}, (_, i) => i + 1);
  const startOffset = Array.from({length: firstDayOfMonth}, (_, i) => i);
  const currentMonthName = viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelect = (day: number) => {
    const mm = (month + 1).toString().padStart(2, '0');
    const dd = day.toString().padStart(2, '0');
    const formatted = `${year}-${mm}-${dd}`;
    onChange(formatted);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label className="block text-xs font-bold text-foreground/70 mb-1">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-background border ${isOpen ? 'border-primary ring-1 ring-primary' : 'border-secondary hover:border-primary/50'} rounded-xl cursor-pointer flex justify-between items-center transition-all group shadow-inner`}
      >
        <span className={`font-bold text-sm transition-colors ${value ? 'text-foreground' : 'text-foreground/50'}`}>
          {value ? formatDate(value) : "Select Date"}
        </span>
        <CalendarDays className={`w-4 h-4 transition-colors ${isOpen ? 'text-primary' : 'text-foreground/30 group-hover:text-primary'}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="absolute z-50 top-full mt-2 left-0 w-72 p-5 bg-white dark:bg-neutral-900 border border-secondary/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center justify-between mb-6">
                <button type="button" onClick={handlePrevMonth} className="p-1.5 hover:bg-secondary rounded-lg transition-colors border border-transparent hover:border-secondary/50"><ChevronLeft className="w-4 h-4" /></button>
                <span className="font-bold text-sm tracking-wide">{currentMonthName}</span>
                <button type="button" onClick={handleNextMonth} className="p-1.5 hover:bg-secondary rounded-lg transition-colors border border-transparent hover:border-secondary/50"><ChevronRight className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center mb-3">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <span key={d} className="text-[10px] font-black text-foreground/30 uppercase">{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {startOffset.map(i => <div key={`empty-${i}`} />)}
                {days.map(d => {
                  const mm = (month + 1).toString().padStart(2, '0');
                  const dd = d.toString().padStart(2, '0');
                  const dateStr = `${year}-${mm}-${dd}`;
                  const isSelected = value === dateStr;
                  
                  // Check if date is in the past
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const currentDateObj = new Date(year, month, d);
                  const isPast = currentDateObj < today;

                  return (
                    <button 
                      key={d} 
                      type="button"
                      disabled={isPast}
                      onClick={() => !isPast && handleSelect(d)}
                      className={`h-8 w-full rounded-lg text-xs font-bold flex items-center justify-center transition-all duration-200 ${
                        isPast
                          ? 'text-foreground/20 cursor-not-allowed'
                          : isSelected 
                            ? 'bg-primary text-white shadow-lg shadow-primary/40 scale-105 border border-primary/50' 
                            : 'hover:bg-secondary hover:text-primary border border-transparent'
                      }`}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function CustomTimePicker({ value, onChange, label, accent = "primary" }: { value: string, onChange: (v: string) => void, label: string, accent?: "primary"|"emerald"|"red" }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Generate times (every 30 mins)
  const times = [];
  for(let h=0; h<24; h++) {
    for(let m of [0, 30]) {
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      times.push(`${hh}:${mm}`);
    }
  }

  const activeColorClass = accent === "emerald" ? "text-emerald-500" : accent === "red" ? "text-red-500" : "text-primary";
  const activeBgClass = accent === "emerald" ? "bg-emerald-500 shadow-emerald-500/40 border-emerald-500/50" : accent === "red" ? "bg-red-500 shadow-red-500/40 border-red-500/50" : "bg-primary shadow-primary/40 border-primary/50";
  const hoverBorderClass = accent === "emerald" ? "hover:border-emerald-500/50" : accent === "red" ? "hover:border-red-500/50" : "hover:border-primary/50";
  const openBorderClass = accent === "emerald" ? "border-emerald-500 ring-emerald-500" : accent === "red" ? "border-red-500 ring-red-500" : "border-primary ring-primary";

  return (
    <div className="relative">
      <label className="block text-xs font-bold text-foreground/70 mb-1">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-background border ${isOpen ? `${openBorderClass} ring-1` : `border-secondary ${hoverBorderClass}`} rounded-xl cursor-pointer flex justify-between items-center transition-all group shadow-inner`}
      >
        <span className={`font-bold text-sm transition-colors ${value ? 'text-foreground' : 'text-foreground/50'}`}>
          {value ? formatTime(value) : "Select"}
        </span>
        <Clock className={`w-4 h-4 transition-colors ${isOpen ? activeColorClass : `text-foreground/30 group-hover:${activeColorClass}`}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="absolute z-50 top-full mt-2 left-0 w-full h-64 overflow-y-auto p-2 bg-white dark:bg-neutral-900 border border-secondary/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] custom-scrollbar"
            >
              {times.map(t => {
                const isSelected = value === t;
                return (
                  <button 
                    key={t} 
                    type="button"
                    onClick={() => { onChange(t); setIsOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 mb-1 border ${
                      isSelected 
                        ? `${activeBgClass} text-white shadow-lg border-transparent` 
                        : 'border-transparent hover:bg-secondary hover:border-secondary/50'
                    }`}
                  >
                    {formatTime(t)}
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// Mock Data
const MOCK_JOBS: JobPost[] = [];

export default function JobsManagement() {
  const [jobs, setJobs] = useState<JobPost[]>(MOCK_JOBS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<JobStatus | "All">("All");

  const getAuthHeaders = () => {
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    return {
      'x-user-email': user.email || 'admin@example.com',
      'x-user-id': user.id || 'U-001'
    };
  };
  
  // Selection State
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<JobPost>>({});

  // Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<JobPost>>({
    role: "", venueName: "", date: "", startTime: "", endTime: "", hourlyRate: 0, 
    instructions: "", uniform: "", parking: "", isUrgent: false
  });

  // Local API Fetch
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch('/api/jobs', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setJobs(data);
        }
      } catch (err) {
        console.error("Failed to fetch jobs", err);
      }
    };
    fetchJobs();
  }, []);

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = j.role.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          j.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          j.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          j.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filter === "All") return true;
    return j.status === filter;
  });

  const openJobDetails = (job: JobPost) => {
    setSelectedJobId(job.id);
    setIsEditing(false);
    setEditForm(job);
  };

  const handleSaveEdit = async () => {
    if (!selectedJobId) return;
    const finalHours = calculateHours(editForm.startTime || "", editForm.endTime || "");
    const updatedForm = { ...editForm, hours: finalHours };

    try {
      await fetch('/api/jobs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(updatedForm)
      });
    } catch (e) {
      console.error(e);
    }

    setJobs(jobs.map(j => j.id === selectedJobId ? { ...j, ...updatedForm } as JobPost : j));
    setIsEditing(false);
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalHours = calculateHours(createForm.startTime || "", createForm.endTime || "");
    
    // Simple validation
    if (!createForm.date || !createForm.startTime || !createForm.endTime) {
      console.error("Please complete the date and time fields.");
      return;
    }

    const newJob: Partial<JobPost> = {
      id: `J-${Math.floor(Math.random() * 9000) + 1000}`,
      clientId: "C-000",
      clientName: "New Client",
      role: createForm.role || "Unknown Role",
      venueName: createForm.venueName || "Unknown Venue",
      date: createForm.date || "",
      startTime: createForm.startTime || "",
      endTime: createForm.endTime || "",
      hours: finalHours,
      hourlyRate: Number(createForm.hourlyRate) || 0,
      status: "Open",
      isUrgent: createForm.isUrgent || false,
      instructions: createForm.instructions || "",
      uniform: createForm.uniform || "",
      parking: createForm.parking || "",
      applicants: [],
      assignedWorkerId: null,
      assignedWorkerName: null
    };
    
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(newJob)
      });
      if (res.ok) {
        const savedJob = await res.json();
        setJobs([savedJob, ...jobs]);
      }
    } catch (e) {
      setJobs([{ ...newJob } as JobPost, ...jobs]);
    }

    setIsCreating(false);
    setCreateForm({
      role: "", venueName: "", date: "", startTime: "", endTime: "", hourlyRate: 0, 
      instructions: "", uniform: "", parking: "", isUrgent: false
    });
  };

  const handleAssignWorker = async (worker: Applicant) => {
    if (!selectedJobId) return;
    
    const targetJob = jobs.find(j => j.id === selectedJobId);
    if (targetJob) {
      const updated = { ...targetJob, status: "Filled" as JobStatus, assignedWorkerId: worker.id, assignedWorkerName: worker.name };
      try {
        await fetch('/api/jobs', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify(updated) });
      } catch (e) {}
    }

    setJobs(jobs.map(j => {
      if (j.id === selectedJobId) {
        return { ...j, status: "Filled" as JobStatus, assignedWorkerId: worker.id, assignedWorkerName: worker.name };
      }
      return j;
    }));
  };

  const handleUnassignWorker = async () => {
    if (!selectedJobId) return;
    
    const targetJob = jobs.find(j => j.id === selectedJobId);
    if (targetJob) {
      const updated = { ...targetJob, status: "Open" as JobStatus, assignedWorkerId: null, assignedWorkerName: null };
      try {
        await fetch('/api/jobs', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify(updated) });
      } catch (e) {}
    }

    setJobs(jobs.map(j => {
      if (j.id === selectedJobId) {
        return { ...j, status: "Open" as JobStatus, assignedWorkerId: null, assignedWorkerName: null };
      }
      return j;
    }));
  };

  const handleCancelJob = async () => {
    if (!selectedJobId) return;
    
    const targetJob = jobs.find(j => j.id === selectedJobId);
    if (targetJob) {
      const updated = { ...targetJob, status: "Cancelled" as JobStatus };
      try {
        await fetch('/api/jobs', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify(updated) });
      } catch (e) {}
    }

    setJobs(jobs.map(j => j.id === selectedJobId ? { ...j, status: "Cancelled" as JobStatus } : j));
    setSelectedJobId(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Management</h1>
          <p className="text-foreground/70 mt-1">Create shifts, edit operational details, and assign workers.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <Plus className="w-5 h-5" /> Create New Job
        </button>
      </div>

      <div className="glass rounded-2xl bg-background/50 border border-secondary flex flex-col overflow-hidden">
        <div className="p-4 border-b border-secondary/50 flex flex-col md:flex-row gap-4 justify-between items-center bg-secondary/10">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by role, venue, or ID..." 
              className="w-full pl-10 pr-4 py-2 bg-background border border-secondary rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {(["All", "Open", "Filled", "Cancelled"] as const).map(f => (
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

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/30 text-foreground/70 border-b border-secondary/50 select-none">
              <tr>
                <th className="px-6 py-4 font-medium">Job Details</th>
                <th className="px-6 py-4 font-medium">Date & Time</th>
                <th className="px-6 py-4 font-medium">Hourly Rate</th>
                <th className="px-6 py-4 font-medium">Applicants</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  key={job.id} 
                  onClick={() => openJobDetails(job)}
                  className="border-b border-secondary/20 hover:bg-secondary/10 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${job.status === "Filled" ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"}`}>
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold group-hover:text-primary transition-colors text-base">{job.role}</p>
                          {job.isUrgent && <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase rounded border border-amber-500/20">Urgent</span>}
                        </div>
                        <p className="text-xs text-foreground/70 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {job.venueName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium">{formatDate(job.date)}</p>
                    <p className="text-xs text-foreground/50">{formatTime(job.startTime)} - {formatTime(job.endTime)} ({job.hours}h)</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-black text-emerald-500">${job.hourlyRate.toFixed(2)}<span className="text-xs text-foreground/50 font-normal">/hr</span></p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-foreground/50" />
                      <span className="font-bold">{job.applicants.length}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      job.status === "Open" ? "bg-primary/10 text-primary border border-primary/20" : 
                      job.status === "Filled" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : 
                      "bg-secondary text-foreground/70 border border-secondary"
                    }`}>
                      {job.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-foreground/50">
                    No jobs found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JOB CREATION MODAL */}
      <AnimatePresence>
        {isCreating && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-background border border-secondary shadow-2xl rounded-3xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-secondary flex justify-between items-center bg-secondary/5">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Plus className="w-6 h-6 text-primary" /> Create New Job Post
                </h2>
                <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreateJob} className="p-6 overflow-y-auto space-y-6">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1">ROLE / TITLE</label>
                    <input required type="text" value={createForm.role} onChange={e => setCreateForm({...createForm, role: e.target.value})} placeholder="e.g. Lead Bartender" className="w-full px-4 py-2.5 bg-secondary/10 border border-secondary rounded-xl focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1">VENUE NAME</label>
                    <input required type="text" value={createForm.venueName} onChange={e => setCreateForm({...createForm, venueName: e.target.value})} placeholder="e.g. The Rustic Table" className="w-full px-4 py-2.5 bg-secondary/10 border border-secondary rounded-xl focus:outline-none focus:border-primary transition-colors" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <CustomDatePicker 
                    label="DATE" 
                    value={createForm.date || ""} 
                    onChange={val => setCreateForm({...createForm, date: val})} 
                  />
                  <CustomTimePicker 
                    label="START TIME" 
                    accent="emerald"
                    value={createForm.startTime || ""} 
                    onChange={val => setCreateForm({...createForm, startTime: val})} 
                  />
                  <CustomTimePicker 
                    label="END TIME" 
                    accent="red"
                    value={createForm.endTime || ""} 
                    onChange={val => setCreateForm({...createForm, endTime: val})} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1">HOURLY RATE ($)</label>
                    <div className="relative flex items-center bg-secondary/10 border border-secondary rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all group">
                      <div className="pl-4 pr-2 py-2.5 bg-secondary/20 border-r border-secondary group-focus-within:bg-primary/10 group-focus-within:border-primary group-focus-within:text-primary transition-colors">
                        <DollarSign className="w-5 h-5 text-foreground/50 group-focus-within:text-primary transition-colors" />
                      </div>
                      <input 
                        required 
                        type="number" min="15" step="0.5" 
                        value={createForm.hourlyRate || ''} 
                        onChange={e => setCreateForm({...createForm, hourlyRate: Number(e.target.value)})} 
                        placeholder="e.g. 25.50" 
                        className="w-full bg-transparent px-3 py-2.5 focus:outline-none font-bold text-sm" 
                      />
                    </div>
                  </div>
                  <div className="flex items-center mt-6">
                    <label className="flex items-center justify-center gap-3 cursor-pointer p-2.5 border border-amber-500/30 bg-amber-500/5 rounded-xl w-full hover:bg-amber-500/10 transition-colors">
                      <input type="checkbox" checked={createForm.isUrgent} onChange={e => setCreateForm({...createForm, isUrgent: e.target.checked})} className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary" />
                      <span className="font-bold text-amber-500 text-sm uppercase tracking-wider">Mark as Urgent Job</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-secondary">
                  <h3 className="font-bold text-lg">Detailed Information</h3>
                  
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1">ARRIVAL INSTRUCTIONS & DUTIES</label>
                    <textarea value={createForm.instructions} onChange={e => setCreateForm({...createForm, instructions: e.target.value})} placeholder="Where to enter, who to ask for, and main responsibilities..." className="w-full h-20 p-3 bg-secondary/10 border border-secondary rounded-xl focus:outline-none focus:border-primary resize-none transition-colors" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1">UNIFORM / DRESS CODE</label>
                    <input type="text" value={createForm.uniform} onChange={e => setCreateForm({...createForm, uniform: e.target.value})} placeholder="e.g. All black, non-slip shoes..." className="w-full px-4 py-2.5 bg-secondary/10 border border-secondary rounded-xl focus:outline-none focus:border-primary transition-colors" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1">PARKING INFORMATION</label>
                    <input type="text" value={createForm.parking} onChange={e => setCreateForm({...createForm, parking: e.target.value})} placeholder="e.g. Free staff parking in rear..." className="w-full px-4 py-2.5 bg-secondary/10 border border-secondary rounded-xl focus:outline-none focus:border-primary transition-colors" />
                  </div>
                </div>

                <div className="pt-6 border-t border-secondary flex justify-end gap-4">
                  <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-2.5 border border-secondary rounded-xl font-bold hover:bg-secondary/50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-8 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                    Publish Job Post
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* JOB DETAILS / EDIT PANEL */}
      <AnimatePresence>
        {selectedJob && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedJobId(null); setIsEditing(false); }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-background border-l border-secondary shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-secondary flex justify-between items-start bg-secondary/5">
                <div className="w-full mr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-foreground/50 font-mono tracking-wider">{selectedJob.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      selectedJob.status === "Open" ? "bg-primary/10 text-primary border border-primary/20" : 
                      selectedJob.status === "Filled" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : 
                      "bg-secondary text-foreground/70 border border-secondary"
                    }`}>
                      {selectedJob.status}
                    </span>
                    {selectedJob.isUrgent && <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase rounded border border-amber-500/20">Urgent</span>}
                  </div>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={editForm.role || ""} 
                      onChange={e => setEditForm({...editForm, role: e.target.value})} 
                      className="text-2xl font-black bg-secondary/20 border border-primary rounded-lg px-3 py-1 w-full mb-2 focus:outline-none focus:ring-1 focus:ring-primary transition-all" 
                    />
                  ) : (
                    <h2 className="text-2xl font-black">{selectedJob.role}</h2>
                  )}
                  
                  {isEditing ? (
                    <div className="flex items-center gap-2 bg-secondary/20 border border-primary rounded-lg px-3 py-1 w-full focus-within:ring-1 focus-within:ring-primary transition-all">
                      <MapPin className="w-4 h-4 text-primary" />
                      <input 
                        type="text" 
                        value={editForm.venueName || ""} 
                        onChange={e => setEditForm({...editForm, venueName: e.target.value})} 
                        className="text-sm font-medium bg-transparent border-none w-full focus:outline-none" 
                      />
                    </div>
                  ) : (
                    <p className="text-foreground/70 font-medium flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" /> {selectedJob.venueName}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {selectedJob.status === "Open" && (
                    <button 
                      onClick={() => isEditing ? handleSaveEdit() : setIsEditing(true)} 
                      className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${isEditing ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "border border-secondary hover:bg-secondary/50"}`}
                    >
                      {isEditing ? <><Check className="w-4 h-4" /> Save Details</> : <><Edit3 className="w-4 h-4" /> Edit Job</>}
                    </button>
                  )}
                  <button onClick={() => { setSelectedJobId(null); setIsEditing(false); }} className="p-2 hover:bg-secondary rounded-full transition-colors ml-1">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* Logistics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-5 border rounded-2xl bg-background glass flex flex-col justify-center transition-all duration-300 ${isEditing ? 'border-primary shadow-lg shadow-primary/5' : 'border-secondary'}`}>
                    <div className={`flex items-center gap-2 text-xs font-bold mb-3 ${isEditing ? 'text-primary' : 'text-foreground/50'}`}>
                      <CalendarDays className="w-4 h-4" /> SCHEDULE
                    </div>
                    {isEditing ? (
                      <div className="space-y-4">
                        <CustomDatePicker 
                          label="DATE" 
                          value={editForm.date || ""} 
                          onChange={val => setEditForm({...editForm, date: val})} 
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <CustomTimePicker 
                            label="START" 
                            accent="emerald"
                            value={editForm.startTime || ""} 
                            onChange={val => setEditForm({...editForm, startTime: val})} 
                          />
                          <CustomTimePicker 
                            label="END" 
                            accent="red"
                            value={editForm.endTime || ""} 
                            onChange={val => setEditForm({...editForm, endTime: val})} 
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-bold text-lg mb-1">{formatDate(selectedJob.date)}</p>
                        <p className="text-sm font-medium text-foreground/70 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {formatTime(selectedJob.startTime)} - {formatTime(selectedJob.endTime)} 
                          <span className="ml-1 px-1.5 py-0.5 bg-secondary rounded text-xs font-bold">{selectedJob.hours}h</span>
                        </p>
                      </>
                    )}
                  </div>

                  <div className={`p-5 border rounded-2xl bg-background glass flex flex-col justify-between transition-all duration-300 ${isEditing ? 'border-primary shadow-lg shadow-primary/5' : 'border-secondary'}`}>
                    <div className={`flex items-center gap-2 text-xs font-bold mb-2 ${isEditing ? 'text-primary' : 'text-foreground/50'}`}>
                      <DollarSign className="w-4 h-4" /> HOURLY RATE
                    </div>
                    {isEditing ? (
                      <div className="mt-2">
                        <div className="flex items-center bg-secondary/10 border border-secondary rounded-lg px-3 py-2 focus-within:border-primary transition-all">
                          <span className="text-emerald-500 font-black text-xl mr-1">$</span>
                          <input type="number" min="15" step="0.5" value={editForm.hourlyRate || ""} onChange={e => setEditForm({...editForm, hourlyRate: Number(e.target.value)})} className="w-full bg-transparent focus:outline-none font-black text-emerald-500 text-xl" />
                        </div>
                        <label className="flex items-center justify-center gap-2 mt-4 cursor-pointer p-2 border border-amber-500/30 bg-amber-500/5 rounded-lg hover:bg-amber-500/10 transition-colors">
                          <input type="checkbox" checked={editForm.isUrgent || false} onChange={e => setEditForm({...editForm, isUrgent: e.target.checked})} className="w-4 h-4 rounded text-primary accent-primary" />
                          <span className="font-bold text-amber-500 text-xs">Mark Urgent</span>
                        </label>
                      </div>
                    ) : (
                      <div className="mt-auto">
                        <p className="font-black text-emerald-500 text-4xl">${selectedJob.hourlyRate.toFixed(2)}</p>
                        <p className="text-sm font-bold text-foreground/50 uppercase tracking-widest mt-1">Per Hour</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Detailed Information */}
                <div>
                  <h4 className="text-sm font-bold text-foreground/50 mb-4 uppercase tracking-wider">Detailed Information</h4>
                  <div className="space-y-3">
                    
                    {/* Instructions */}
                    <div className={`p-4 rounded-xl border flex gap-4 transition-all ${isEditing ? 'bg-background border-primary shadow-sm shadow-primary/10' : 'bg-secondary/10 border-secondary'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isEditing ? 'bg-primary/20 text-primary' : 'bg-background border border-secondary text-foreground/70'}`}>
                        <Navigation className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className={`text-xs font-bold mb-1 ${isEditing ? 'text-primary' : 'text-foreground/50'}`}>ARRIVAL INSTRUCTIONS</p>
                        {isEditing ? (
                          <textarea value={editForm.instructions || ""} onChange={e => setEditForm({...editForm, instructions: e.target.value})} className="w-full h-20 p-3 bg-secondary/10 border border-secondary rounded-lg text-sm resize-none focus:outline-none focus:border-primary transition-colors" />
                        ) : (
                          <p className="text-sm leading-relaxed font-medium">{selectedJob.instructions || "No specific instructions provided."}</p>
                        )}
                      </div>
                    </div>

                    {/* Uniform */}
                    <div className={`p-4 rounded-xl border flex gap-4 transition-all ${isEditing ? 'bg-background border-primary shadow-sm shadow-primary/10' : 'bg-secondary/10 border-secondary'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isEditing ? 'bg-primary/20 text-primary' : 'bg-background border border-secondary text-foreground/70'}`}>
                        <Shirt className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className={`text-xs font-bold mb-1 ${isEditing ? 'text-primary' : 'text-foreground/50'}`}>UNIFORM / DRESS CODE</p>
                        {isEditing ? (
                          <input type="text" value={editForm.uniform || ""} onChange={e => setEditForm({...editForm, uniform: e.target.value})} className="w-full px-3 py-2 bg-secondary/10 border border-secondary rounded-lg text-sm focus:outline-none focus:border-primary transition-colors" />
                        ) : (
                          <p className="text-sm leading-relaxed font-medium">{selectedJob.uniform || "Standard uniform."}</p>
                        )}
                      </div>
                    </div>

                    {/* Parking */}
                    <div className={`p-4 rounded-xl border flex gap-4 transition-all ${isEditing ? 'bg-background border-primary shadow-sm shadow-primary/10' : 'bg-secondary/10 border-secondary'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isEditing ? 'bg-primary/20 text-primary' : 'bg-background border border-secondary text-foreground/70'}`}>
                        <Car className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className={`text-xs font-bold mb-1 ${isEditing ? 'text-primary' : 'text-foreground/50'}`}>PARKING INFO</p>
                        {isEditing ? (
                          <input type="text" value={editForm.parking || ""} onChange={e => setEditForm({...editForm, parking: e.target.value})} className="w-full px-3 py-2 bg-secondary/10 border border-secondary rounded-lg text-sm focus:outline-none focus:border-primary transition-colors" />
                        ) : (
                          <p className="text-sm leading-relaxed font-medium">{selectedJob.parking || "Not specified."}</p>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Assignment / Applicants */}
                {!isEditing && (
                  <div className="border-t border-secondary pt-8">
                    {selectedJob.status === "Filled" ? (
                      <div>
                        <h4 className="text-sm font-bold text-emerald-500 mb-4 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5" /> Job Assigned
                        </h4>
                        <div className="p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-500">
                              {selectedJob.assignedWorkerName?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold">{selectedJob.assignedWorkerName}</p>
                              <p className="text-xs text-foreground/50">{selectedJob.assignedWorkerId}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={handleUnassignWorker}
                              className="px-4 py-2 border border-red-500/30 text-red-500 bg-red-500/10 text-xs font-bold rounded-lg hover:bg-red-500/20 transition-colors"
                            >
                              Unassign
                            </button>
                            <button className="px-4 py-2 border border-secondary text-xs font-bold rounded-lg hover:bg-secondary/50 transition-colors">
                              View Profile
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : selectedJob.status === "Cancelled" ? (
                      <div>
                        <h4 className="text-sm font-bold text-foreground/50 mb-4 flex items-center gap-2">
                          <XCircle className="w-5 h-5" /> Job Cancelled
                        </h4>
                        <div className="p-4 border border-secondary bg-secondary/5 rounded-xl text-center text-sm font-medium text-foreground/60">
                          This job post has been cancelled and cannot accept assignments.
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
                          <Users className="w-5 h-5 text-primary" /> Applicants ({selectedJob.applicants.length})
                        </h4>
                        
                        {selectedJob.applicants.length > 0 ? (
                          <div className="space-y-3">
                            {selectedJob.applicants.map(applicant => (
                              <div key={applicant.id} className="p-4 border border-secondary bg-background rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                    {applicant.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold group-hover:text-primary transition-colors cursor-pointer">{applicant.name}</p>
                                    <div className="flex items-center gap-3 text-xs mt-0.5">
                                      <span className="flex items-center gap-1 text-foreground/70">
                                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {applicant.rating}
                                      </span>
                                      <span className={applicant.reliability >= 95 ? "text-emerald-500 font-medium" : "text-foreground/70"}>
                                        {applicant.reliability}% Reliable
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                  <span className="text-xs text-foreground/40 font-medium hidden sm:block">{applicant.appliedAt}</span>
                                  <button 
                                    onClick={() => handleAssignWorker(applicant)}
                                    className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors text-center"
                                  >
                                    Assign Worker
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center border border-dashed border-secondary rounded-xl bg-secondary/5">
                            <p className="text-foreground/50 text-sm">No workers have applied for this job yet.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>

              {selectedJob.status === "Open" && !isEditing && (
                <div className="p-6 border-t border-secondary bg-background">
                  <button onClick={handleCancelJob} className="w-full py-3 border border-red-500/50 text-red-500 font-bold rounded-xl hover:bg-red-500/10 transition-colors">
                    Cancel Job Post
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
