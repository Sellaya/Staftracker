"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Briefcase, Search, Plus, MapPin, CalendarDays, Clock, 
  DollarSign, AlertCircle, X, Users, CheckCircle2, Edit3, Check, Navigation, Shirt, Car,
  ChevronLeft, ChevronRight, XCircle, UserCheck
} from "lucide-react";
import { scoreWorkerForJob } from "@/lib/jobs-shared";

// Types
type JobStatus = "Open" | "Filled" | "Cancelled";

type Applicant = {
  id: string;
  name: string;
  reliability: number;
  appliedAt: string;
  status?: string;
  rejectionReason?: string;
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
  headcount?: number;
  venueId?: string;
};

function applicantStatusBadge(status?: string): { label: string; className: string } {
  const s = status || "pending_admin";
  switch (s) {
    case "pending_admin":
      return { label: "Pending review", className: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
    case "confirmed":
      return { label: "Confirmed", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" };
    case "rejected":
      return { label: "Rejected", className: "bg-red-500/10 text-red-600 border-red-500/30" };
    case "withdrawn":
      return { label: "Withdrawn", className: "bg-secondary text-foreground/50 border-secondary" };
    default:
      return { label: s, className: "bg-secondary text-foreground/60 border-secondary" };
  }
}

function sortApplicantsForDisplay(a: Applicant, b: Applicant, jobRole: string, workers: unknown[]): number {
  const rank = (s?: string) => {
    const v = s || "pending_admin";
    if (v === "pending_admin") return 0;
    if (v === "confirmed") return 1;
    if (v === "rejected") return 2;
    if (v === "withdrawn") return 3;
    return 4;
  };
  const ra = rank(a.status) - rank(b.status);
  if (ra !== 0) return ra;
  const wa = workers.find((w: any) => w.id === a.id) as Record<string, unknown> | undefined;
  const wb = workers.find((w: any) => w.id === b.id) as Record<string, unknown> | undefined;
  const sa = wa ? scoreWorkerForJob(wa, jobRole) : Number(a.reliability ?? 0);
  const sb = wb ? scoreWorkerForJob(wb, jobRole) : Number(b.reliability ?? 0);
  return sb - sa;
}

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
    for(const m of [0, 30]) {
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
  const [clients, setClients] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [allWorkers, setAllWorkers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<JobStatus | "All" | "PendingReview">("All");
  const isClientUser = currentUser?.role === "user";
  const canManageAssignments = currentUser?.role === "admin" || currentUser?.role === "super_admin";

  useEffect(() => {
    fetch('/api/me').then(res => res.ok ? res.json() : null).then(data => setCurrentUser(data)).catch(() => setCurrentUser(null));
    fetch('/api/jobs').then(res => (res.ok ? res.json() : [])).then(data => setJobs(Array.isArray(data) ? data : []));
    fetch('/api/clients').then(res => (res.ok ? res.json() : [])).then(data => setClients(Array.isArray(data) ? data : []));
    fetch('/api/venues').then(res => (res.ok ? res.json() : [])).then(data => setVenues(Array.isArray(data) ? data : []));
    fetch('/api/workers').then(res => (res.ok ? res.json() : [])).then(data => setAllWorkers(Array.isArray(data) ? data : []));
  }, []);

  const getAuthHeaders = () => {
    return {};
  };

  // Selection State
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<JobPost>>({});
  const [manualSearchResults, setManualSearchResults] = useState<any[]>([]);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentBusy, setAssignmentBusy] = useState(false);
  const [rejectDraftApplicantId, setRejectDraftApplicantId] = useState<string | null>(null);
  const [rejectDraftNote, setRejectDraftNote] = useState("");

  // Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingJob, setIsSavingJob] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [showAddVenueInline, setShowAddVenueInline] = useState(false);
  const [isCreatingVenueInline, setIsCreatingVenueInline] = useState(false);
  const [venueInlineError, setVenueInlineError] = useState<string | null>(null);
  const [newVenueInline, setNewVenueInline] = useState({ name: "", address: "", gps: "" });
  const [createForm, setCreateForm] = useState({
    clientId: "", role: "", venueId: "", date: "", startTime: "", endTime: "", hourlyRate: 0,
    headcount: 1,
    instructions: "", uniform: "", parking: "", isUrgent: false
  });

  useEffect(() => {
    if (currentUser?.role === "user" && clients.length > 0) {
      setCreateForm((prev) => (prev.clientId ? prev : { ...prev, clientId: clients[0].id }));
    }
  }, [currentUser, clients]);

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

  const suggestedWorkers = useMemo(() => {
    if (!selectedJob || selectedJob.status !== "Open" || !canManageAssignments) return [];
    return [...allWorkers]
      .filter((w) => w.id && w.id !== selectedJob.assignedWorkerId)
      .map((w) => ({ w, score: scoreWorkerForJob(w, selectedJob.role) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.w);
  }, [selectedJob, allWorkers, canManageAssignments]);

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = j.role.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          j.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          j.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          j.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filter === "All") return true;
    if (filter === "PendingReview") {
      const apps = Array.isArray(j.applicants) ? j.applicants : [];
      return (
        j.status === "Open" &&
        apps.some((a: any) => (a.status || "pending_admin") === "pending_admin")
      );
    }
    return j.status === filter;
  });

  const openJobDetails = (job: JobPost) => {
    setSelectedJobId(job.id);
    setIsEditing(false);
    setEditForm(job);
    setAssignmentError(null);
    setManualSearchResults([]);
    setRejectDraftApplicantId(null);
    setRejectDraftNote("");
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
    setCreateError(null);
    setCreateSuccess(null);
    const finalHours = calculateHours(createForm.startTime || "", createForm.endTime || "");
    
    // Simple validation
    if (!createForm.clientId || !createForm.venueId || !createForm.role.trim()) {
      setCreateError("Please choose client, venue, and role.");
      return;
    }
    if (!createForm.date || !createForm.startTime || !createForm.endTime) {
      setCreateError("Please complete date and time fields.");
      return;
    }
    if (finalHours <= 0) {
      setCreateError("Shift duration must be greater than 0.");
      return;
    }
    if (Number(createForm.hourlyRate) < 15) {
      setCreateError("Hourly rate must be at least $15.");
      return;
    }

    const client = clients.find(c => c.id === createForm.clientId);
    const venue = venues.find(v => v.id === createForm.venueId);

    const hc = Math.max(1, Math.min(50, Math.floor(Number(createForm.headcount) || 1)));
    const newJob: Partial<JobPost> = {
      clientId: createForm.clientId,
      clientName: client?.name || "Unknown Client",
      role: createForm.role || "Unknown Role",
      venueId: createForm.venueId,
      venueName: venue?.name || "Unknown Venue",
      date: createForm.date || "",
      startTime: createForm.startTime || "",
      endTime: createForm.endTime || "",
      hours: finalHours,
      hourlyRate: Number(createForm.hourlyRate) || 0,
      headcount: hc,
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
      setIsSavingJob(true);
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(newJob)
      });
      if (res.ok) {
        const savedJob = await res.json();
        setJobs([savedJob, ...jobs]);
        setCreateSuccess("Job posted successfully. Workers can now view and apply.");
      } else {
        const err = await res.json().catch(() => ({}));
        setCreateError(err.error || "Failed to publish job.");
        return;
      }
    } catch {
      setCreateError("Failed to publish job.");
      return;
    } finally {
      setIsSavingJob(false);
    }

    setIsCreating(false);
    setShowAddVenueInline(false);
    setNewVenueInline({ name: "", address: "", gps: "" });
    setCreateForm({
      clientId: "", role: "", venueId: "", date: "", startTime: "", endTime: "", hourlyRate: 0,
      headcount: 1,
      instructions: "", uniform: "", parking: "", isUrgent: false
    });
  };

  const handleCreateVenueInline = async () => {
    setVenueInlineError(null);
    if (!createForm.clientId) {
      setVenueInlineError("Select a client first.");
      return;
    }
    if (!newVenueInline.name.trim() || !newVenueInline.address.trim()) {
      setVenueInlineError("Venue name and address are required.");
      return;
    }
    try {
      setIsCreatingVenueInline(true);
      const client = clients.find((c) => c.id === createForm.clientId);
      const payload = {
        name: newVenueInline.name.trim(),
        clientId: createForm.clientId,
        clientName: client?.name || "",
        address: newVenueInline.address.trim(),
        gps: newVenueInline.gps.trim(),
        status: "Active",
        departments: [
          { name: "Front of House", active: true },
          { name: "Back of House", active: true },
          { name: "Security", active: true }
        ],
        instructions: "",
        dressCode: "",
        parkingInfo: ""
      };
      const res = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setVenueInlineError(err.error || "Failed to create venue.");
        return;
      }
      const created = await res.json();
      setVenues((prev) => [...prev, created]);
      setCreateForm((prev) => ({ ...prev, venueId: created.id }));
      setShowAddVenueInline(false);
      setNewVenueInline({ name: "", address: "", gps: "" });
    } finally {
      setIsCreatingVenueInline(false);
    }
  };

  const handleAssignWorker = async (worker: { id: string; name: string }) => {
    if (!selectedJobId || !canManageAssignments) return;
    setAssignmentError(null);
    const targetJob = jobs.find((j) => j.id === selectedJobId);
    if (!targetJob || targetJob.status !== "Open") return;

    const st = (id: string) =>
      targetJob.applicants?.find((a) => a.id === id)?.status || "pending_admin";
    const isPendingApplicant = st(worker.id) === "pending_admin";

    try {
      setAssignmentBusy(true);
      const res = await fetch("/api/jobs/assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isPendingApplicant ? "confirm_applicant" : "admin_direct_assign",
          jobId: selectedJobId,
          workerId: worker.id,
          workerName: worker.name,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAssignmentError(typeof data.error === "string" ? data.error : `Assignment failed (${res.status})`);
        return;
      }
      const updated = data as JobPost;
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? { ...j, ...updated } : j)));
      setManualSearchResults([]);
    } catch {
      setAssignmentError("Could not reach the server. Try again.");
    } finally {
      setAssignmentBusy(false);
    }
  };

  const handleRejectApplicant = async (workerId: string, rejectReason?: string) => {
    if (!selectedJobId || !canManageAssignments) return;
    setAssignmentError(null);
    try {
      setAssignmentBusy(true);
      const res = await fetch("/api/jobs/assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject_applicant",
          jobId: selectedJobId,
          workerId,
          rejectReason: rejectReason || "Not selected for this shift",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAssignmentError(typeof data.error === "string" ? data.error : "Reject failed");
        return;
      }
      const updated = data as JobPost;
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? { ...j, ...updated } : j)));
      setRejectDraftApplicantId(null);
      setRejectDraftNote("");
    } catch {
      setAssignmentError("Could not reach the server. Try again.");
    } finally {
      setAssignmentBusy(false);
    }
  };

  const handleUnassignWorker = async () => {
    if (!selectedJobId || !canManageAssignments) return;
    setAssignmentError(null);
    try {
      setAssignmentBusy(true);
      const res = await fetch("/api/jobs/assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unassign", jobId: selectedJobId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAssignmentError(typeof data.error === "string" ? data.error : "Unassign failed");
        return;
      }
      const updated = data as JobPost;
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? { ...j, ...updated } : j)));
    } catch {
      setAssignmentError("Could not reach the server. Try again.");
    } finally {
      setAssignmentBusy(false);
    }
  };

  const handleCancelJob = async () => {
    if (!selectedJobId) return;
    
    const targetJob = jobs.find(j => j.id === selectedJobId);
    if (targetJob) {
      const updated = { ...targetJob, status: "Cancelled" as JobStatus };
      try {
        await fetch('/api/jobs', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify(updated) });
      } catch {}
    }

    setJobs(jobs.map(j => j.id === selectedJobId ? { ...j, status: "Cancelled" as JobStatus } : j));
    setSelectedJobId(null);
    setRejectDraftApplicantId(null);
    setRejectDraftNote("");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Management</h1>
          <p className="text-foreground/70 mt-1">{isClientUser ? "Create jobs for your venues and track applicants." : "Create shifts, edit operational details, and assign workers."}</p>
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
            {(["All", "Open", "PendingReview", "Filled", "Cancelled"] as const).map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === f ? "bg-primary text-primary-foreground" : "border border-secondary hover:bg-secondary/50"
                }`}
              >
                {f === "PendingReview" ? "Pending review" : f}
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
                      <span className="font-bold">
                        {(Array.isArray(job.applicants) ? job.applicants : []).filter(
                          (a: any) => (a.status || "pending_admin") !== "withdrawn"
                        ).length}
                      </span>
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
                {createError && (
                  <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 text-sm font-bold">
                    {createError}
                  </div>
                )}
                {createSuccess && (
                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-sm font-bold">
                    {createSuccess}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1">ASSOCIATED CLIENT</label>
                    <select required disabled={isClientUser} value={createForm.clientId} onChange={e => setCreateForm({...createForm, clientId: e.target.value})} className="w-full px-4 py-2.5 bg-secondary/10 border border-secondary rounded-xl focus:outline-none focus:border-primary transition-colors disabled:opacity-60">
                      <option value="">Select Client...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {isClientUser && <p className="mt-1 text-[11px] text-foreground/50">Locked to your client account.</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1">VENUE / LOCATION</label>
                    <select required value={createForm.venueId} onChange={e => setCreateForm({...createForm, venueId: e.target.value})} className="w-full px-4 py-2.5 bg-secondary/10 border border-secondary rounded-xl focus:outline-none focus:border-primary transition-colors">
                      <option value="">Select Venue...</option>
                      {venues.filter(v => !createForm.clientId || v.clientId === createForm.clientId).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddVenueInline((s) => !s)}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        {showAddVenueInline ? "Cancel new venue" : "+ Add new venue for this job"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1">ROLE / TITLE</label>
                    <input required type="text" value={createForm.role} onChange={e => setCreateForm({...createForm, role: e.target.value})} placeholder="e.g. Lead Bartender" className="w-full px-4 py-2.5 bg-secondary/10 border border-secondary rounded-xl focus:outline-none focus:border-primary transition-colors" />
                  </div>
                </div>

                {showAddVenueInline && (
                  <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
                    <p className="text-sm font-bold text-primary">Create New Venue</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={newVenueInline.name}
                        onChange={(e) => setNewVenueInline((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Venue name"
                        className="px-3 py-2.5 bg-background border border-secondary rounded-xl focus:outline-none focus:border-primary"
                      />
                      <input
                        type="text"
                        value={newVenueInline.gps}
                        onChange={(e) => setNewVenueInline((prev) => ({ ...prev, gps: e.target.value }))}
                        placeholder="GPS (optional)"
                        className="px-3 py-2.5 bg-background border border-secondary rounded-xl focus:outline-none focus:border-primary"
                      />
                    </div>
                    <input
                      type="text"
                      value={newVenueInline.address}
                      onChange={(e) => setNewVenueInline((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="Venue address"
                      className="w-full px-3 py-2.5 bg-background border border-secondary rounded-xl focus:outline-none focus:border-primary"
                    />
                    {venueInlineError && (
                      <div className="text-xs font-bold text-red-600">{venueInlineError}</div>
                    )}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={isCreatingVenueInline}
                        onClick={handleCreateVenueInline}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm disabled:opacity-60"
                      >
                        {isCreatingVenueInline ? "Adding..." : "Save Venue"}
                      </button>
                    </div>
                  </div>
                )}

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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1">WORKERS NEEDED</label>
                    <input
                      required
                      type="number"
                      min={1}
                      max={50}
                      value={createForm.headcount}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          headcount: Math.max(1, Math.min(50, Math.floor(Number(e.target.value)) || 1)),
                        })
                      }
                      className="w-full px-4 py-2.5 bg-secondary/10 border border-secondary rounded-xl focus:outline-none focus:border-primary font-bold text-sm"
                    />
                    <p className="text-[10px] text-foreground/50 mt-1">MVP: first slot uses assignment flow; headcount stored for ops.</p>
                  </div>
                  <div className="flex items-center md:mt-6">
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
                    {isSavingJob ? "Publishing..." : "Publish Job Post"}
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
              onClick={() => { setSelectedJobId(null); setIsEditing(false); setAssignmentError(null); setManualSearchResults([]); setRejectDraftApplicantId(null); setRejectDraftNote(""); }}
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
                  <button onClick={() => { setSelectedJobId(null); setIsEditing(false); setAssignmentError(null); setManualSearchResults([]); setRejectDraftApplicantId(null); setRejectDraftNote(""); }} className="p-2 hover:bg-secondary rounded-full transition-colors ml-1">
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
                    {assignmentError && (
                      <div className="mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 text-sm font-medium flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{assignmentError}</span>
                      </div>
                    )}
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
                          {canManageAssignments && (
                            <div className="flex gap-2">
                              <button 
                                type="button"
                                onClick={handleUnassignWorker}
                                disabled={assignmentBusy}
                                className="px-4 py-2 border border-red-500/30 text-red-500 bg-red-500/10 text-xs font-bold rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                              >
                                Unassign
                              </button>
                              <button type="button" className="px-4 py-2 border border-secondary text-xs font-bold rounded-lg hover:bg-secondary/50 transition-colors">
                                View Profile
                              </button>
                            </div>
                          )}
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
                      <>
                        {/* Applicants Section */}
                        {selectedJob.applicants.length > 0 && (
                          <div className="space-y-3 mb-8">
                            <h5 className="text-xs font-bold text-foreground/50 mb-3 uppercase tracking-widest">Applicants</h5>
                            {[...selectedJob.applicants]
                              .sort((a, b) =>
                                sortApplicantsForDisplay(a, b, selectedJob.role || "", allWorkers)
                              )
                              .map((applicant) => {
                              const st = applicant.status || "pending_admin";
                              const badge = applicantStatusBadge(applicant.status);
                              const isPending = st === "pending_admin";
                              return (
                                <div key={applicant.id} className="p-4 border border-secondary bg-background rounded-xl flex flex-col gap-3 group">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                                        {applicant.name.charAt(0)}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="font-bold truncate group-hover:text-primary transition-colors">{applicant.name}</p>
                                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${badge.className}`}>
                                            {badge.label}
                                          </span>
                                        </div>
                                        <div className="text-xs mt-0.5 text-foreground/70">
                                          Reliability: {applicant.reliability}% · Applied {applicant.appliedAt ? new Date(applicant.appliedAt).toLocaleString() : "—"}
                                        </div>
                                        {applicant.rejectionReason && st === "rejected" && (
                                          <p className="text-xs text-red-600/90 mt-1">{applicant.rejectionReason}</p>
                                        )}
                                      </div>
                                    </div>
                                    {canManageAssignments && (
                                      <div className="flex flex-wrap gap-2 justify-end">
                                        {isPending && (
                                          <>
                                            <button
                                              type="button"
                                              disabled={assignmentBusy}
                                              onClick={() => handleAssignWorker({ id: applicant.id, name: applicant.name })}
                                              className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                            >
                                              Confirm
                                            </button>
                                            {rejectDraftApplicantId === applicant.id ? (
                                              <div className="w-full sm:w-auto flex flex-col gap-2 min-w-[12rem]">
                                                <input
                                                  type="text"
                                                  value={rejectDraftNote}
                                                  onChange={(e) => setRejectDraftNote(e.target.value)}
                                                  placeholder="Optional note to applicant…"
                                                  className="w-full px-3 py-2 text-xs border border-secondary rounded-lg bg-background focus:outline-none focus:border-primary"
                                                />
                                                <div className="flex gap-2 flex-wrap justify-end">
                                                  <button
                                                    type="button"
                                                    disabled={assignmentBusy}
                                                    onClick={() => {
                                                      setRejectDraftApplicantId(null);
                                                      setRejectDraftNote("");
                                                    }}
                                                    className="px-3 py-2 border border-secondary text-xs font-bold rounded-lg hover:bg-secondary/30"
                                                  >
                                                    Cancel
                                                  </button>
                                                  <button
                                                    type="button"
                                                    disabled={assignmentBusy}
                                                    onClick={() =>
                                                      handleRejectApplicant(
                                                        applicant.id,
                                                        rejectDraftNote.trim() || undefined
                                                      )
                                                    }
                                                    className="px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
                                                  >
                                                    Confirm reject
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <button
                                                type="button"
                                                disabled={assignmentBusy}
                                                onClick={() => {
                                                  setRejectDraftApplicantId(applicant.id);
                                                  setRejectDraftNote("");
                                                }}
                                                className="px-4 py-2 border border-red-500/40 text-red-600 bg-red-500/5 text-xs font-bold rounded-xl hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                              >
                                                Reject
                                              </button>
                                            )}
                                          </>
                                        )}
                                        {(st === "rejected" || st === "withdrawn") && (
                                          <button
                                            type="button"
                                            disabled={assignmentBusy}
                                            onClick={() => handleAssignWorker({ id: applicant.id, name: applicant.name })}
                                            className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                                          >
                                            Direct assign
                                          </button>
                                        )}
                                      </div>
                                    )}
                                    {!canManageAssignments && (
                                      <span className="text-xs font-bold text-foreground/50 shrink-0">{badge.label}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {canManageAssignments && suggestedWorkers.length > 0 && (
                          <div className="space-y-3 mb-8">
                            <h5 className="text-xs font-bold text-foreground/50 uppercase tracking-widest flex items-center gap-2">
                              <UserCheck className="w-4 h-4" /> Suggested matches
                            </h5>
                            <p className="text-[11px] text-foreground/50">Ranked by role fit, clearance, and reliability (non-AI Week 2 hint).</p>
                            <div className="space-y-2">
                              {suggestedWorkers.map((w: any) => {
                                const sc = scoreWorkerForJob(w, selectedJob.role);
                                return (
                                  <div
                                    key={w.id}
                                    className="p-3 border border-secondary rounded-xl flex flex-wrap items-center justify-between gap-2 bg-secondary/5"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                        {w.name?.charAt(0)}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-bold truncate">{w.name}</p>
                                        <p className="text-[10px] text-foreground/50 uppercase tracking-tighter truncate">{w.role}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-[10px] font-black text-primary/80 tabular-nums">+{sc}</span>
                                      <button
                                        type="button"
                                        disabled={assignmentBusy}
                                        onClick={() => handleAssignWorker({ id: w.id, name: w.name })}
                                        className="text-xs font-bold text-primary px-3 py-1.5 bg-primary/10 rounded-lg hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                                      >
                                        Assign
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Manual Search Section */}
                        {canManageAssignments && (
                          <div className="pt-6 border-t border-secondary">
                            <h5 className="text-xs font-bold text-foreground/50 mb-4 uppercase tracking-widest">Manual Worker Search</h5>
                            <div className="space-y-4">
                              <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                                <input
                                  type="text"
                                  placeholder="Search all workers…"
                                  onChange={(e) => {
                                    const term = e.target.value.toLowerCase().trim();
                                    if (!term) {
                                      setManualSearchResults([]);
                                      return;
                                    }
                                    const scored = allWorkers
                                      .filter(
                                        (w) =>
                                          (String(w.name || "").toLowerCase().includes(term) ||
                                            String(w.email || "").toLowerCase().includes(term)) &&
                                          w.id !== selectedJob.assignedWorkerId
                                      )
                                      .map((w) => ({ w, score: scoreWorkerForJob(w, selectedJob.role) }))
                                      .sort((a, b) => b.score - a.score)
                                      .slice(0, 8)
                                      .map((x) => x.w);
                                    setManualSearchResults(scored);
                                  }}
                                  className="w-full pl-10 pr-4 py-3 bg-secondary/10 border border-secondary rounded-xl focus:outline-none focus:border-primary transition-colors text-sm"
                                />
                              </div>

                              {manualSearchResults.length > 0 && (
                                <div className="bg-secondary/5 rounded-xl border border-secondary divide-y divide-secondary/50 overflow-hidden">
                                  {manualSearchResults.map((w: any) => (
                                    <div key={w.id} className="p-3 hover:bg-secondary/20 transition-colors flex justify-between items-center gap-2">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                          {w.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm font-bold truncate">{w.name}</p>
                                          <p className="text-[10px] text-foreground/50 uppercase tracking-tighter truncate">{w.role}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] font-black text-primary/80 tabular-nums">
                                          +{scoreWorkerForJob(w, selectedJob.role)}
                                        </span>
                                        <button
                                          type="button"
                                          disabled={assignmentBusy}
                                          onClick={() => {
                                            handleAssignWorker({ id: w.id, name: w.name });
                                            setManualSearchResults([]);
                                          }}
                                          className="text-xs font-bold text-primary px-3 py-1.5 bg-primary/10 rounded-lg hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                                        >
                                          Assign
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
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
