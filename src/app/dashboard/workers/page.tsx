"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Filter, ShieldCheck, AlertCircle, 
  X, UserCircle, Star, History, DollarSign, 
  FileText, ShieldAlert, Edit3, Trash2, Check, X as CancelIcon,
  Plus, Loader2, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight
} from "lucide-react";

// Types
type Note = { id: string; text: string; date: string };
type SortKey = "name" | "rating" | "reliability" | "status";

// Mock Data
const INITIAL_WORKERS: any[] = [];

export default function WorkersPage() {
  const [workers, setWorkers] = useState(INITIAL_WORKERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("All"); 
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" } | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Profile Panel State
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview"); 
  
  // Notes State
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  // Add Worker State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newWorkerData, setNewWorkerData] = useState({
    name: "", email: "", phone: "", address: "", roles: [] as string[]
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editWorkerData, setEditWorkerData] = useState<any>(null);

  // Fetch Workers
  useEffect(() => {
    fetch('/api/workers')
      .then(res => res.json())
      .then(data => setWorkers(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const getAuthHeaders = () => {
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    return {
      'x-user-email': user.email || 'admin@example.com',
      'x-user-id': user.id || 'U-001'
    };
  };

  // Accessibility: Close modal on Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedWorkerId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset pagination when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filter]);

  // Derived State (Filtered & Sorted)
  const processedWorkers = useMemo(() => {
    let result = [...workers];

    // 1. Filter
    result = result.filter(w => {
      const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) || w.id.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filter === "All") return true;
      if (filter === "Active") return w.status === "Active";
      if (filter === "Suspended") return w.status === "Suspended";
      if (filter === "Pending Docs") return w.documentStatus === "Pending";
      if (filter === "Flagged") return w.flags.length > 0;
      
      return true;
    });

    // 2. Sort
    if (sortConfig) {
      result.sort((a, b) => {
        let valA: any = a[sortConfig.key];
        let valB: any = b[sortConfig.key];

        if (sortConfig.key === "name") {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [workers, searchQuery, filter, sortConfig]);

  // Pagination Slice
  const totalPages = Math.ceil(processedWorkers.length / itemsPerPage);
  const paginatedWorkers = processedWorkers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const selectedWorker = workers.find(w => w.id === selectedWorkerId);

  // Actions
  const handleSort = (key: SortKey) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const toggleSuspend = (id: string) => {
    const worker = workers.find(w => w.id === id);
    if (worker) {
      updateWorkerStatus(id, { status: worker.status === "Active" ? "Suspended" : "Active" });
    }
  };

  const approveDocuments = (id: string) => {
    updateWorkerStatus(id, { documentStatus: "Approved" });
  };

  // Notes Actions
  const addNote = async (id: string) => {
    if (!newNote.trim()) return;
    const worker = workers.find(w => w.id === id);
    if (!worker) return;

    const noteObj: Note = {
      id: Math.random().toString(36).substring(7),
      text: newNote.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    
    const updatedNotes = [noteObj, ...worker.notes];
    try {
      const res = await fetch('/api/workers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ ...worker, notes: updatedNotes })
      });
      if (res.ok) {
        setWorkers(workers.map(w => w.id === id ? { ...w, notes: updatedNotes } : w));
        setNewNote("");
      }
    } catch (e) { console.error(e); }
  };

  const deleteNote = async (workerId: string, noteId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    const updatedNotes = worker.notes.filter((n: any) => n.id !== noteId);
    try {
      const res = await fetch('/api/workers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ ...worker, notes: updatedNotes })
      });
      if (res.ok) {
        setWorkers(workers.map(w => w.id === workerId ? { ...w, notes: updatedNotes } : w));
      }
    } catch (e) { console.error(e); }
  };

  const startEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.text);
  };

  const saveEditNote = async (workerId: string) => {
    if (!editingNoteText.trim()) return;
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    const updatedNotes = worker.notes.map((n: any) => n.id === editingNoteId ? { ...n, text: editingNoteText.trim() } : n);
    try {
      const res = await fetch('/api/workers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ ...worker, notes: updatedNotes })
      });
      if (res.ok) {
        setWorkers(workers.map(w => w.id === workerId ? { ...w, notes: updatedNotes } : w));
        setEditingNoteId(null);
        setEditingNoteText("");
      }
    } catch (e) { console.error(e); }
  };

  const overrideRole = async (id: string, role: string) => {
    const worker = workers.find(w => w.id === id);
    if (!worker) return;
    
    const overrides = worker.roleOverrides.includes(role) 
      ? worker.roleOverrides.filter((r: any) => r !== role)
      : [...worker.roleOverrides, role];
      
    try {
      const res = await fetch('/api/workers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ ...worker, roleOverrides: overrides })
      });
      if (res.ok) {
        setWorkers(workers.map(w => w.id === id ? { ...w, roleOverrides: overrides } : w));
      }
    } catch (e) { console.error(e); }
  };
  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const res = await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(newWorkerData)
      });
      if (res.ok) {
        const added = await res.json();
        setWorkers([added, ...workers]);
        setIsAddModalOpen(false);
        setNewWorkerData({ name: "", email: "", phone: "", address: "", roles: [] });
      }
    } catch (e) { console.error(e); }
    finally { setIsAdding(false); }
  };

  const handleUpdateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/workers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(editWorkerData)
      });
      if (res.ok) {
        setWorkers(workers.map(w => w.id === editWorkerData.id ? editWorkerData : w));
        setIsEditModalOpen(false);
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteWorker = async (id: string) => {
    if (!confirm("Are you sure you want to delete this worker? This action is irreversible.")) return;
    try {
      const res = await fetch(`/api/workers?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setWorkers(workers.filter(w => w.id !== id));
        setSelectedWorkerId(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete worker");
      }
    } catch (e) { console.error(e); }
  };

  const updateWorkerStatus = async (id: string, updates: any) => {
    const worker = workers.find(w => w.id === id);
    if (!worker) return;
    try {
      const res = await fetch('/api/workers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ ...worker, ...updates })
      });
      if (res.ok) {
        setWorkers(workers.map(w => w.id === id ? { ...w, ...updates } : w));
      }
    } catch (e) { console.error(e); }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40 group-hover:opacity-100" />;
    return sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-primary" /> : <ArrowDown className="w-3 h-3 ml-1 text-primary" />;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Worker Management</h1>
          <p className="text-foreground/70 mt-1">Manage shift staff, review documents, and track reliability.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <Plus className="w-5 h-5" /> Add New Worker
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
              placeholder="Search workers by name or ID..." 
              className="w-full pl-10 pr-4 py-2 bg-background border border-secondary rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {["All", "Active", "Suspended", "Pending Docs", "Flagged"].map(f => (
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
                <th className="px-6 py-4 font-medium cursor-pointer group" onClick={() => handleSort("name")}>
                  <div className="flex items-center">Worker Info <SortIcon columnKey="name" /></div>
                </th>
                <th className="px-6 py-4 font-medium">Approved Roles</th>
                <th className="px-6 py-4 font-medium cursor-pointer group" onClick={() => handleSort("rating")}>
                  <div className="flex items-center">Rating & Reliability <SortIcon columnKey="rating" /></div>
                </th>
                <th className="px-6 py-4 font-medium">Documents</th>
                <th className="px-6 py-4 font-medium cursor-pointer group" onClick={() => handleSort("status")}>
                  <div className="flex items-center">Status <SortIcon columnKey="status" /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedWorkers.map((worker, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  key={worker.id} 
                  onClick={() => setSelectedWorkerId(worker.id)}
                  className="border-b border-secondary/20 hover:bg-secondary/10 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {worker.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold group-hover:text-primary transition-colors">{worker.name}</p>
                          {worker.flags.length > 0 && <ShieldAlert className="w-3 h-3 text-red-500" />}
                        </div>
                        <p className="text-xs text-foreground/50">{worker.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {worker.roles.map((role: string) => (
                        <span key={role} className="px-2 py-1 bg-secondary/50 rounded-md text-xs font-medium">{role}</span>
                      ))}
                      {worker.roleOverrides.map((role: string) => (
                        <span key={role} className="px-2 py-1 bg-amber-500/20 text-amber-500 rounded-md text-xs font-bold border border-amber-500/30">
                          {role} (Override)
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 font-bold">
                        {worker.rating} <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      </div>
                      <span className={`text-xs font-medium ${worker.reliability < 90 ? "text-red-500" : "text-emerald-500"}`}>
                        {worker.reliability}% Reliability
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {worker.documentStatus === "Approved" && (
                      <span className="flex items-center gap-1 text-emerald-500 text-xs font-medium">
                        <ShieldCheck className="w-4 h-4" /> Valid
                      </span>
                    )}
                    {worker.documentStatus === "Pending" && (
                      <span className="flex items-center gap-1 text-amber-500 text-xs font-medium">
                        <AlertCircle className="w-4 h-4" /> Pending
                      </span>
                    )}
                    {worker.documentStatus === "Expiring Soon" && (
                      <span className="flex items-center gap-1 text-amber-500 text-xs font-medium">
                        <AlertCircle className="w-4 h-4" /> Expiring
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      worker.status === "Active" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    }`}>
                      {worker.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
              {paginatedWorkers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-foreground/50">
                    No workers found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-secondary/50 flex items-center justify-between bg-secondary/5">
            <span className="text-sm text-foreground/50">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, processedWorkers.length)} of {processedWorkers.length} workers
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-secondary hover:bg-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-secondary hover:bg-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedWorker && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedWorkerId(null)}
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
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-2xl">
                    {selectedWorker.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      {selectedWorker.name}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        selectedWorker.status === "Active" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                      }`}>
                        {selectedWorker.status}
                      </span>
                    </h2>
                    <p className="text-foreground/50 font-mono text-sm">{selectedWorker.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditWorkerData(selectedWorker); setIsEditModalOpen(true); }} className="p-2 hover:bg-secondary rounded-full" title="Edit Profile"><Edit3 size={20}/></button>
                  <button onClick={() => setSelectedWorkerId(null)} className="p-2 hover:bg-secondary rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex border-b border-secondary px-6 pt-2 bg-secondary/5">
                {[
                  { id: 'overview', label: 'Overview', icon: UserCircle },
                  { id: 'history', label: 'Shift History', icon: History },
                  { id: 'earnings', label: 'Earnings', icon: DollarSign },
                ].map((tab: any) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-foreground/70 hover:text-foreground'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" /> {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {activeTab === 'overview' && (
                  <>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-foreground/50 mb-1">CONTACT INFO</h4>
                          <p className="text-sm">{selectedWorker.email}</p>
                          <p className="text-sm">{selectedWorker.phone}</p>
                          <p className="text-sm">{selectedWorker.address}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-foreground/50 mb-1">PERFORMANCE</h4>
                          <div className="flex gap-4">
                            <div>
                              <span className="text-2xl font-bold">{selectedWorker.rating}</span>
                              <span className="text-sm text-foreground/70 ml-1">Stars</span>
                            </div>
                            <div>
                              <span className="text-2xl font-bold">{selectedWorker.reliability}%</span>
                              <span className="text-sm text-foreground/70 ml-1">Reliability</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-foreground/50 mb-1">DOCUMENTS</h4>
                          <div className="flex items-center gap-3">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${
                              selectedWorker.documentStatus === "Approved" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                              selectedWorker.documentStatus === "Pending" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                              "bg-amber-500/5 border-amber-500/20 text-amber-500"
                            }`}>
                              <FileText className="w-4 h-4" /> {selectedWorker.documentStatus}
                            </div>
                            {selectedWorker.documentStatus === "Pending" && (
                              <button onClick={() => approveDocuments(selectedWorker.id)} className="text-xs font-bold text-emerald-500 hover:underline">
                                Quick Approve
                              </button>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-foreground/50 mb-1">ACTIONS</h4>
                          <div className="flex flex-col gap-2">
                            <button 
                              onClick={() => toggleSuspend(selectedWorker.id)}
                              className={`w-full py-2 rounded-lg text-sm font-bold border transition-colors ${
                                selectedWorker.status === "Active" 
                                  ? "border-red-500/50 text-red-500 hover:bg-red-500/10" 
                                  : "border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10"
                              }`}
                            >
                              {selectedWorker.status === "Active" ? "Suspend Worker" : "Unsuspend Worker"}
                            </button>
                            <button 
                              onClick={() => handleDeleteWorker(selectedWorker.id)}
                              className="w-full py-2 rounded-lg text-sm font-bold border border-red-500 bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" /> Delete Worker Profile
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-secondary pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-primary" /> Role Eligibility
                        </h4>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {selectedWorker.roles.map((role: string) => (
                          <span key={role} className="px-3 py-1 bg-secondary rounded-lg text-sm font-medium">{role}</span>
                        ))}
                        {selectedWorker.roleOverrides.map((role: string) => (
                          <span key={role} className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-lg text-sm font-bold">
                            {role} (Admin Override)
                          </span>
                        ))}
                      </div>
                      <div className="p-4 rounded-xl border border-dashed border-secondary bg-secondary/5">
                        <p className="text-xs font-medium text-foreground/70 mb-2">Emergency Override Role Assignment:</p>
                        <div className="flex gap-2">
                          {["Bartender", "Manager", "Security"].filter((r: string) => !selectedWorker.roles.includes(r) && !selectedWorker.roleOverrides.includes(r)).map((role: string) => (
                            <button 
                              key={role}
                              onClick={() => overrideRole(selectedWorker.id, role)}
                              className="px-3 py-1 text-xs font-bold border border-secondary rounded-lg hover:bg-secondary/50 hover:text-primary transition-colors"
                            >
                              + Override {role}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-secondary pt-6">
                      <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
                        <Edit3 className="w-4 h-4 text-primary" /> Admin Notes & Flags
                      </h4>
                      
                      <div className="space-y-3 mb-6">
                        {selectedWorker.notes.length > 0 ? (
                          selectedWorker.notes.map((note: any) => (
                            <div key={note.id} className="p-4 rounded-xl bg-secondary/20 border border-secondary/50 flex flex-col gap-2 group">
                              <div className="flex justify-between items-start">
                                <span className="text-xs text-foreground/50 font-mono">{note.date}</span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {editingNoteId !== note.id && (
                                    <>
                                      <button onClick={() => startEditNote(note)} className="text-foreground/50 hover:text-primary" title="Edit Note">
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => deleteNote(selectedWorker.id, note.id)} className="text-foreground/50 hover:text-red-500" title="Delete Note">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {editingNoteId === note.id ? (
                                <div className="flex gap-2">
                                  <input 
                                    autoFocus
                                    type="text" 
                                    value={editingNoteText}
                                    onChange={(e) => setEditingNoteText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && saveEditNote(selectedWorker.id)}
                                    className="flex-1 px-3 py-1.5 bg-background border border-primary rounded text-sm focus:outline-none"
                                  />
                                  <button onClick={() => saveEditNote(selectedWorker.id)} className="p-1.5 bg-emerald-500/20 text-emerald-500 rounded hover:bg-emerald-500/30">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setEditingNoteId(null)} className="p-1.5 bg-secondary text-foreground/70 rounded hover:text-foreground">
                                    <CancelIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.text}</p>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-foreground/50 italic">No notes added yet.</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addNote(selectedWorker.id)}
                          placeholder="Add internal observation or warning..." 
                          className="flex-1 px-4 py-2 bg-background border border-secondary rounded-lg text-sm focus:outline-none focus:border-primary"
                        />
                        <button 
                          onClick={() => addNote(selectedWorker.id)}
                          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90"
                        >
                          Add Note
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'history' && (
                  <div className="space-y-4">
                    {selectedWorker.shiftHistory.length > 0 ? (
                      selectedWorker.shiftHistory.map((shift: any, i: number) => (
                        <div key={i} className="p-4 rounded-xl border border-secondary bg-secondary/5 flex justify-between items-center">
                          <div>
                            <p className="font-bold">{shift.role} @ {shift.venue}</p>
                            <p className="text-xs text-foreground/70">{shift.date}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{shift.hours} hours</p>
                            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Completed</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-foreground/50 py-8">No shift history found.</p>
                    )}
                  </div>
                )}

                {activeTab === 'earnings' && (
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-primary/5 border border-emerald-500/20">
                      <p className="text-sm font-bold text-emerald-500 mb-1">Total Lifetime Earnings</p>
                      <p className="text-4xl font-black">{selectedWorker.lifetimeEarnings}</p>
                    </div>
                    
                    <h4 className="text-sm font-bold mb-2">Earnings Breakdown</h4>
                    <div className="space-y-3">
                      {selectedWorker.shiftHistory.length > 0 ? (
                        selectedWorker.shiftHistory.map((shift: any, i: number) => (
                          <div key={i} className="flex justify-between items-center p-3 border-b border-secondary/30 last:border-0">
                            <div>
                              <p className="text-sm font-medium">{shift.date}</p>
                              <p className="text-xs text-foreground/50">{shift.venue}</p>
                            </div>
                            <span className="font-bold text-lg">{shift.pay}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-foreground/50">No earnings recorded.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ADD WORKER MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-background border border-secondary shadow-2xl rounded-3xl z-[70] overflow-hidden"
            >
              <div className="p-6 border-b border-secondary flex justify-between items-center bg-secondary/5">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" /> Onboard New Worker
                </h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddWorker} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground/70">FULL NAME</label>
                  <input required type="text" value={newWorkerData.name} onChange={e => setNewWorkerData({...newWorkerData, name: e.target.value})} placeholder="e.g. John Doe" className="w-full px-4 py-2.5 bg-secondary/10 border border-secondary rounded-xl focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground/70">EMAIL ADDRESS</label>
                    <input required type="email" value={newWorkerData.email} onChange={e => setNewWorkerData({...newWorkerData, email: e.target.value})} placeholder="john@example.com" className="w-full px-4 py-2.5 bg-secondary/10 border border-secondary rounded-xl focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground/70">PHONE NUMBER</label>
                    <input required type="tel" value={newWorkerData.phone} onChange={e => setNewWorkerData({...newWorkerData, phone: e.target.value})} placeholder="(416) 000-0000" className="w-full px-4 py-2.5 bg-secondary/10 border border-secondary rounded-xl focus:outline-none focus:border-primary transition-colors" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground/70">RESIDENTIAL ADDRESS</label>
                  <input required type="text" value={newWorkerData.address} onChange={e => setNewWorkerData({...newWorkerData, address: e.target.value})} placeholder="123 Street Name, Toronto" className="w-full px-4 py-2.5 bg-secondary/10 border border-secondary rounded-xl focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground/70">INITIAL ROLES (Select multiple)</label>
                  <div className="flex flex-wrap gap-2">
                    {["Bartender", "Server", "Chef", "Security", "General Labor"].map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          const roles = newWorkerData.roles.includes(role) 
                            ? newWorkerData.roles.filter(r => r !== role) 
                            : [...newWorkerData.roles, role];
                          setNewWorkerData({...newWorkerData, roles});
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          newWorkerData.roles.includes(role) ? "bg-primary border-primary text-white" : "border-secondary hover:border-primary/50"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 border border-secondary rounded-xl font-bold hover:bg-secondary/50 transition-colors">Cancel</button>
                  <button type="submit" disabled={isAdding} className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Save Worker</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* EDIT WORKER MODAL */}
      <AnimatePresence>
        {isEditModalOpen && editWorkerData && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60]" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-background border border-secondary shadow-2xl rounded-3xl z-[70] overflow-hidden">
              <div className="p-6 border-b border-secondary flex justify-between items-center bg-secondary/5">
                <h2 className="text-xl font-bold">Edit Worker Profile</h2>
                <button onClick={() => setIsEditModalOpen(false)}><X size={20}/></button>
              </div>
              <form onSubmit={handleUpdateWorker} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground/70">FULL NAME</label>
                  <input required type="text" value={editWorkerData.name} onChange={e => setEditWorkerData({...editWorkerData, name: e.target.value})} className="w-full px-4 py-2 bg-secondary/10 border border-secondary rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input required type="email" value={editWorkerData.email} onChange={e => setEditWorkerData({...editWorkerData, email: e.target.value})} className="px-4 py-2 bg-secondary/10 border border-secondary rounded-xl" />
                  <input required type="tel" value={editWorkerData.phone} onChange={e => setEditWorkerData({...editWorkerData, phone: e.target.value})} className="px-4 py-2 bg-secondary/10 border border-secondary rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground/70">ROLES</label>
                  <div className="flex flex-wrap gap-2">
                    {["Bartender", "Server", "Chef", "Security", "Labor"].map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          const roles = editWorkerData.roles.includes(role) 
                            ? editWorkerData.roles.filter((r: any) => r !== role) 
                            : [...editWorkerData.roles, role];
                          setEditWorkerData({...editWorkerData, roles});
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border ${editWorkerData.roles.includes(role) ? "bg-primary text-white" : "border-secondary"}`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl mt-4">Save Changes</button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
