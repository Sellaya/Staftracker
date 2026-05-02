"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CalendarDays, Clock, MapPin, Search, Filter, AlertTriangle, 
  CheckCircle2, X, UserCircle, MoreVertical, ShieldAlert,
  ArrowRight, Timer, Navigation, ChevronRight, FileText, Check
} from "lucide-react";

// Types
type ShiftStatus = "Active" | "Upcoming" | "Completed" | "Cancelled";

type Shift = {
  id: string;
  workerId: string;
  workerName: string;
  clientId?: string;
  clientName?: string;
  venueName: string;
  role: string;
  date: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualCheckIn?: string;
  actualCheckOut?: string;
  hours: number;
  status: ShiftStatus;
  isFlagged: boolean;
  flagReason?: string;
  gpsStatus?: "Verified" | "Out of Bounds" | "Unknown";
  isApproved?: boolean;
  isInvoiced?: boolean;
  invoiceId?: string;
  timesheetId?: string;
  paymentStatus?: "pending" | "finalized" | "paid";
  invoiceStatus?: "pending" | "invoiced";
};

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [editingTimes, setEditingTimes] = useState(false);
  const [tempCheckIn, setTempCheckIn] = useState("");
  const [tempCheckOut, setTempCheckOut] = useState("");
  const isClientUser = currentUser?.role === "user";
  const isAdminUser = currentUser?.role === "admin" || currentUser?.role === "super_admin";

  const getAuthHeaders = () => {
    return {};
  };

  const fetchShifts = async () => {
    try {
      const res = await fetch('/api/shifts');
      const data = await res.json();
      if (Array.isArray(data)) setShifts(data);
    } catch (e) {
      console.error("Failed to fetch shifts", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCurrentUser(data))
      .catch(() => setCurrentUser(null));
  }, []);

  const filteredShifts = useMemo(() => {
    return shifts.filter(s => {
      const matchesSearch = 
        s.workerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.venueName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      if (filter === "All") return true;
      if (filter === "Flagged") return s.isFlagged;
      return s.status === filter;
    });
  }, [shifts, searchQuery, filter]);

  const selectedShift = shifts.find(s => s.id === selectedShiftId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "Upcoming": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "Completed": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Cancelled": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-secondary text-foreground/50 border-secondary";
    }
  };

  const updateShift = async (id: string, updates: Partial<Shift>) => {
    try {
      const target = shifts.find(s => s.id === id);
      if (!target) return;
      
      const res = await fetch('/api/shifts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ ...target, ...updates })
      });
      
      if (res.ok) {
        setShifts(shifts.map(s => s.id === id ? { ...s, ...updates } : s));
        setEditingTimes(false);
      }
    } catch (e) {
      console.error("Failed to update shift", e);
    }
  };

  const performShiftAction = async (id: string, action: string, extra: Record<string, any> = {}) => {
    try {
      const res = await fetch('/api/shifts/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ shiftId: id, action, ...extra })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Action failed");
        return;
      }
      const updated = await res.json();
      setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
    } catch (e) {
      console.error("Failed to perform shift action", e);
    }
  };

  const saveTimeOverride = () => {
    if (!selectedShiftId) return;
    updateShift(selectedShiftId, {
      actualCheckIn: tempCheckIn,
      actualCheckOut: tempCheckOut,
      status: tempCheckOut ? "Completed" : "Active"
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Active Shifts & Field Ops</h1>
          <p className="text-foreground/70 mt-1">{isClientUser ? "Review shift progress, approvals, and billing status." : "Monitor live field operations and finalise billing hours."}</p>
        </div>
      </div>

      <div className="glass rounded-2xl bg-background/50 border border-secondary overflow-hidden">
        <div className="p-4 border-b border-secondary/50 flex flex-col md:flex-row gap-4 justify-between items-center bg-secondary/10">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client, venue, role, or worker..." 
              className="w-full pl-10 pr-4 py-2 bg-background border border-secondary rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {["All", "Active", "Upcoming", "Completed", "Flagged"].map(f => (
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/30 text-foreground/70 border-b border-secondary/50">
              <tr>
                <th className="px-6 py-4 font-medium">Shift Details</th>
                <th className="px-6 py-4 font-medium">Schedule</th>
                <th className="px-6 py-4 font-medium">Status & Billing</th>
                <th className="px-6 py-4 font-medium">GPS Check-in</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredShifts.map((shift, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  key={shift.id} 
                  onClick={() => setSelectedShiftId(shift.id)}
                  className={`border-b border-secondary/20 hover:bg-secondary/10 transition-colors cursor-pointer group ${
                    shift.isFlagged ? "bg-red-500/5" : ""
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border ${getStatusColor(shift.status)}`}>
                        <CalendarDays className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold group-hover:text-primary transition-colors flex items-center gap-2 text-base">
                          {shift.role}
                          {shift.isFlagged && <AlertTriangle className="w-3 h-3 text-red-500 fill-red-500" />}
                        </p>
                        <p className="text-xs text-foreground/50">{shift.venueName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-foreground/80">{shift.date}</p>
                    <p className="text-xs text-foreground/50">{shift.scheduledStart} - {shift.scheduledEnd}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex gap-2 flex-wrap">
                        {shift.isApproved && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase rounded border border-emerald-500/20">Approved</span>}
                        {shift.isInvoiced && <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase rounded border border-primary/20">Billed</span>}
                        {shift.timesheetId && <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase rounded border border-blue-500/20">Timesheet</span>}
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
                      </div>
                      <p className={`text-xs font-bold ${shift.status === "Active" ? "text-emerald-500" : "text-foreground/50"}`}>{shift.status}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {shift.status === "Active" || shift.status === "Completed" ? (
                      <span className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
                        <MapPin className="w-3.5 h-3.5" /> Verified GPS
                      </span>
                    ) : (
                      <span className="text-xs text-foreground/30 italic">Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-primary text-xs font-bold hover:underline">Details</button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedShift && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedShiftId(null); setEditingTimes(false); }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-background border-l border-secondary shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-secondary flex justify-between items-start bg-secondary/5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-foreground/50 font-mono">{selectedShift.id}</span>
                    {selectedShift.isFlagged && <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black uppercase rounded">Flagged</span>}
                  </div>
                  <h2 className="text-2xl font-black">{selectedShift.role}</h2>
                  <p className="text-foreground/70 font-medium flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedShift.venueName}</p>
                </div>
                <button onClick={() => { setSelectedShiftId(null); setEditingTimes(false); }} className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/10 border border-secondary">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                      {selectedShift.workerName?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest">ASSIGNED WORKER</p>
                      <p className="font-bold text-lg">{selectedShift.workerName}</p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-background rounded-xl border border-transparent hover:border-secondary transition-all">
                    <UserCircle size={24} className="text-foreground/30" />
                  </button>
                </div>

                <div className="p-5 rounded-xl border border-secondary bg-background">
                  <div className="grid grid-cols-2 gap-8 mb-6">
                    <div>
                      <p className="text-xs font-bold text-foreground/50 mb-1">SCHEDULED</p>
                      <p className="text-sm font-medium">{selectedShift.scheduledStart} - {selectedShift.scheduledEnd}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground/50 mb-1">ACTUAL LOGS</p>
                      <p className="text-sm font-medium">
                        {selectedShift.actualCheckIn ? selectedShift.actualCheckIn : "--:--"} to {selectedShift.actualCheckOut ? selectedShift.actualCheckOut : "--:--"}
                      </p>
                    </div>
                  </div>

                  {editingTimes && isAdminUser && (
                    <div className="pt-4 border-t border-secondary/50 animate-in fade-in slide-in-from-top-2">
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
                        <p className="text-xs font-bold text-amber-500 flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3" /> Manual Override
                        </p>
                        <p className="text-xs text-amber-500/80 mt-1">
                          Overriding these times will bypass GPS requirements and calculate billing based on manual inputs.
                        </p>
                      </div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-foreground/70 mb-1">CHECK-IN</label>
                          <input type="time" value={tempCheckIn} onChange={e => setTempCheckIn(e.target.value)} className="w-full px-3 py-2 bg-background border border-primary rounded-lg text-sm focus:outline-none" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-foreground/70 mb-1">CHECK-OUT</label>
                          <input type="time" value={tempCheckOut} onChange={e => setTempCheckOut(e.target.value)} className="w-full px-3 py-2 bg-background border border-primary rounded-lg text-sm focus:outline-none" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingTimes(false)} className="px-3 py-1.5 border border-secondary rounded text-sm font-bold hover:bg-secondary/50">Cancel</button>
                        <button onClick={saveTimeOverride} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-bold shadow-lg hover:bg-primary/90">Save Override</button>
                      </div>
                    </div>
                  )}

                  {!editingTimes && !selectedShift.isInvoiced && isAdminUser && (
                    <button 
                      onClick={() => { setTempCheckIn(selectedShift.actualCheckIn || ""); setTempCheckOut(selectedShift.actualCheckOut || ""); setEditingTimes(true); }}
                      className="w-full py-2.5 border border-secondary border-dashed rounded-xl text-xs font-bold text-foreground/50 hover:border-primary hover:text-primary transition-all"
                    >
                      Override Check-in/out Times
                    </button>
                  )}
                  {selectedShift.isInvoiced && (
                    <div className="py-2.5 text-center bg-secondary/5 border border-secondary rounded-xl text-xs font-bold text-foreground/30 italic">
                      Locked: Shift already billed (Invoice {selectedShift.invoiceId})
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-secondary bg-secondary/5">
                  <p className="text-xs font-bold text-foreground/50 mb-3 uppercase tracking-widest">Lifecycle Status</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-secondary p-2">
                      <p className="text-foreground/50">Timesheet</p>
                      <p className="font-bold">{selectedShift.timesheetId ? selectedShift.timesheetId : "Not created"}</p>
                    </div>
                    <div className="rounded-lg border border-secondary p-2">
                      <p className="text-foreground/50">Approval</p>
                      <p className="font-bold">{selectedShift.isApproved ? "Approved" : "Pending"}</p>
                    </div>
                    <div className="rounded-lg border border-secondary p-2">
                      <p className="text-foreground/50">Payment</p>
                      <p className="font-bold capitalize">{selectedShift.paymentStatus || "pending"}</p>
                    </div>
                    <div className="rounded-lg border border-secondary p-2">
                      <p className="text-foreground/50">Invoice</p>
                      <p className="font-bold capitalize">{selectedShift.invoiceStatus || "pending"}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <h3 className="text-xs font-bold text-foreground/50 mb-2 uppercase tracking-widest">{isClientUser ? "Client Actions" : "Admin Controls"}</h3>
                  
                  {selectedShift.status === "Active" && isAdminUser && (
                    <button 
                      onClick={() => updateShift(selectedShift.id, { status: "Completed", actualCheckOut: new Date().toLocaleTimeString() })}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-primary bg-primary/10 hover:bg-primary/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <div className="text-left">
                          <p className="font-bold text-sm text-primary">Mark as Completed</p>
                          <p className="text-xs text-primary/70 mt-0.5">End shift now and log check-out time.</p>
                        </div>
                      </div>
                    </button>
                  )}

                  {!selectedShift.isApproved && selectedShift.status === "Completed" && !selectedShift.isInvoiced && (
                    <button 
                      onClick={() => performShiftAction(selectedShift.id, "client_approve_timesheet")}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <div className="text-left">
                          <p className="font-bold text-sm text-emerald-500">Approve Timesheet</p>
                          <p className="text-xs text-emerald-500/70 mt-0.5">Client/company approval for worked hours.</p>
                        </div>
                      </div>
                    </button>
                  )}

                  {selectedShift.isApproved && isAdminUser && (
                    <button
                      onClick={() => performShiftAction(selectedShift.id, "admin_finalize_payment")}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-blue-500" />
                        <div className="text-left">
                          <p className="font-bold text-sm text-blue-500">Finalize Payment</p>
                          <p className="text-xs text-blue-500/70 mt-0.5">Admin confirms payment batch readiness.</p>
                        </div>
                      </div>
                    </button>
                  )}

                  {selectedShift.isApproved && isAdminUser && (
                    <button
                      onClick={() => performShiftAction(selectedShift.id, "admin_mark_paid")}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <div className="text-left">
                          <p className="font-bold text-sm text-emerald-500">Mark Worker Paid</p>
                          <p className="text-xs text-emerald-500/70 mt-0.5">Manual payout done.</p>
                        </div>
                      </div>
                    </button>
                  )}

                  {selectedShift.isApproved && isAdminUser && !selectedShift.isInvoiced && (
                    <button
                      onClick={() => performShiftAction(selectedShift.id, "admin_mark_invoiced")}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <div className="text-left">
                          <p className="font-bold text-sm text-primary">Mark Client Invoiced</p>
                          <p className="text-xs text-primary/70 mt-0.5">Manual invoice issued.</p>
                        </div>
                      </div>
                    </button>
                  )}

                  {selectedShift.isFlagged && isAdminUser && (
                    <button 
                      onClick={() => updateShift(selectedShift.id, { isFlagged: false })}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                        <div className="text-left">
                          <p className="font-bold text-sm text-red-500">Resolve Operational Flag</p>
                          <p className="text-xs text-red-500/70 mt-0.5">Dismiss the performance warning.</p>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
