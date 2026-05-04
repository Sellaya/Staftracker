"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CalendarDays, MapPin, AlertTriangle,
  CheckCircle2, X, UserCircle, ShieldAlert,
  FileText, FileWarning
} from "lucide-react";
import { FilterBar, PageHeader, SearchInput, WorkspaceCard } from "@/components/ui/workspace";
import { StatusBadge } from "@/components/ui/status-badge";

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
  const [, setLoading] = useState(true);
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

  const flagShiftIssue = async (id: string) => {
    const reason = window.prompt("Describe the issue for admin review:");
    if (!reason?.trim()) return;
    await performShiftAction(id, "client_flag_issue", { reason: reason.trim() });
  };

  const rejectTimesheet = async (id: string) => {
    const reason = window.prompt("Why is this timesheet being rejected?");
    if (!reason?.trim()) return;
    await performShiftAction(id, "admin_reject_timesheet", { reason: reason.trim() });
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
    <div className="max-w-7xl mx-auto space-y-4 relative">
      <PageHeader
        eyebrow={isClientUser ? "Client field view" : "Field operations"}
        title="Shifts"
        description={isClientUser ? "Review your shift progress, completed timesheets, approvals, and billing state." : "Monitor worker check-ins, timesheets, payment status, and invoice readiness."}
      />

      <WorkspaceCard padding="none" className="overflow-hidden">
        <div className="p-3 border-b border-border flex flex-col md:flex-row gap-3 justify-between items-center bg-card">
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by client, venue, role, or worker..." className="md:max-w-sm" />
          <FilterBar filters={["All", "Active", "Upcoming", "Completed", "Flagged"]} active={filter} onChange={setFilter} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">Shift Details</th>
                <th className="px-4 py-3 font-medium">Schedule</th>
                <th className="px-4 py-3 font-medium">Status & Billing</th>
                <th className="px-4 py-3 font-medium">GPS Check-in</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
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
                  className={`border-b border-border transition-colors cursor-pointer group ${
                    shift.isFlagged ? "bg-red-500/5" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-medium border ${getStatusColor(shift.status)}`}>
                        <CalendarDays className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors flex items-center gap-2">
                          {shift.role}
                          {shift.isFlagged && <AlertTriangle className="w-3 h-3 text-red-500 fill-red-500" />}
                        </p>
                        <p className="text-xs text-foreground/50">{shift.venueName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground/80">{shift.date}</p>
                    <p className="text-xs text-foreground/50">{shift.scheduledStart} - {shift.scheduledEnd}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex gap-2 flex-wrap">
                        {shift.isApproved && <StatusBadge status="Approved" />}
                        {shift.isInvoiced && <StatusBadge status="invoiced" label="Billed" />}
                        {shift.timesheetId && <StatusBadge status="blue" label="Timesheet" />}
                        <StatusBadge status={shift.paymentStatus || "pending"} label={`Pay: ${shift.paymentStatus || "pending"}`} />
                        <StatusBadge status={shift.invoiceStatus || "pending"} label={`Invoice: ${shift.invoiceStatus || "pending"}`} />
                      </div>
                      <StatusBadge status={shift.status} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {shift.status === "Active" || shift.status === "Completed" ? (
                      <span className="flex items-center gap-1 text-emerald-500 text-xs font-medium">
                        <MapPin className="w-3.5 h-3.5" /> Verified GPS
                      </span>
                    ) : (
                      <span className="text-xs text-foreground/30 italic">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-primary text-xs font-medium hover:underline">Details</button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </WorkspaceCard>

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
                    <span className="text-xs font-medium text-foreground/50 font-mono">{selectedShift.id}</span>
                    {selectedShift.isFlagged && <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-medium uppercase rounded">Flagged</span>}
                  </div>
                  <h2 className="text-2xl font-medium">{selectedShift.role}</h2>
                  <p className="text-foreground/70 font-medium flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedShift.venueName}</p>
                </div>
                <button onClick={() => { setSelectedShiftId(null); setEditingTimes(false); }} className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/10 border border-secondary">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xl">
                      {selectedShift.workerName?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground/50 uppercase tracking-widest">ASSIGNED WORKER</p>
                      <p className="font-medium text-lg">{selectedShift.workerName}</p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-background rounded-xl border border-transparent hover:border-secondary transition-all">
                    <UserCircle size={24} className="text-foreground/30" />
                  </button>
                </div>

                <div className="p-5 rounded-xl border border-secondary bg-background">
                  <div className="grid grid-cols-2 gap-8 mb-6">
                    <div>
                      <p className="text-xs font-medium text-foreground/50 mb-1">SCHEDULED</p>
                      <p className="text-sm font-medium">{selectedShift.scheduledStart} - {selectedShift.scheduledEnd}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground/50 mb-1">ACTUAL LOGS</p>
                      <p className="text-sm font-medium">
                        {selectedShift.actualCheckIn ? selectedShift.actualCheckIn : "--:--"} to {selectedShift.actualCheckOut ? selectedShift.actualCheckOut : "--:--"}
                      </p>
                    </div>
                  </div>

                  {editingTimes && isAdminUser && (
                    <div className="pt-4 border-t border-secondary/50 animate-in fade-in slide-in-from-top-2">
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
                        <p className="text-xs font-medium text-amber-500 flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3" /> Manual Override
                        </p>
                        <p className="text-xs text-amber-500/80 mt-1">
                          Overriding these times will bypass GPS requirements and calculate billing based on manual inputs.
                        </p>
                      </div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-foreground/70 mb-1">CHECK-IN</label>
                          <input type="time" value={tempCheckIn} onChange={e => setTempCheckIn(e.target.value)} className="w-full px-3 py-2 bg-background border border-primary rounded-lg text-sm focus:outline-none" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-foreground/70 mb-1">CHECK-OUT</label>
                          <input type="time" value={tempCheckOut} onChange={e => setTempCheckOut(e.target.value)} className="w-full px-3 py-2 bg-background border border-primary rounded-lg text-sm focus:outline-none" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingTimes(false)} className="px-3 py-1.5 border border-secondary rounded text-sm font-medium hover:bg-secondary/50">Cancel</button>
                        <button onClick={saveTimeOverride} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium shadow-lg hover:bg-primary/90">Save Override</button>
                      </div>
                    </div>
                  )}

                  {!editingTimes && !selectedShift.isInvoiced && isAdminUser && (
                    <button 
                      onClick={() => { setTempCheckIn(selectedShift.actualCheckIn || ""); setTempCheckOut(selectedShift.actualCheckOut || ""); setEditingTimes(true); }}
                      className="w-full py-2.5 border border-secondary border-dashed rounded-xl text-xs font-medium text-foreground/50 hover:border-primary hover:text-primary transition-all"
                    >
                      Override Check-in/out Times
                    </button>
                  )}
                  {selectedShift.isInvoiced && (
                    <div className="py-2.5 text-center bg-secondary/5 border border-secondary rounded-xl text-xs font-medium text-foreground/30 italic">
                      Locked: Shift already billed (Invoice {selectedShift.invoiceId})
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-secondary bg-secondary/5">
                  <p className="text-xs font-medium text-foreground/50 mb-3 uppercase tracking-widest">Lifecycle Status</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-secondary p-2">
                      <p className="text-foreground/50">Timesheet</p>
                      <p className="font-medium">{selectedShift.timesheetId ? selectedShift.timesheetId : "Not created"}</p>
                    </div>
                    <div className="rounded-lg border border-secondary p-2">
                      <p className="text-foreground/50">Approval</p>
                      <p className="font-medium">{selectedShift.isApproved ? "Approved" : "Pending"}</p>
                    </div>
                    <div className="rounded-lg border border-secondary p-2">
                      <p className="text-foreground/50">Payment</p>
                      <p className="font-medium capitalize">{selectedShift.paymentStatus || "pending"}</p>
                    </div>
                    <div className="rounded-lg border border-secondary p-2">
                      <p className="text-foreground/50">Invoice</p>
                      <p className="font-medium capitalize">{selectedShift.invoiceStatus || "pending"}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <h3 className="text-xs font-medium text-foreground/50 mb-2 uppercase tracking-widest">{isClientUser ? "Client Actions" : "Admin Controls"}</h3>
                  
                  {selectedShift.status === "Active" && isAdminUser && (
                    <button 
                      onClick={() => updateShift(selectedShift.id, { status: "Completed", actualCheckOut: new Date().toLocaleTimeString() })}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-primary bg-primary/10 hover:bg-primary/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <div className="text-left">
                          <p className="font-medium text-sm text-primary">Mark as Completed</p>
                          <p className="text-xs text-primary/70 mt-0.5">End shift now and log check-out time.</p>
                        </div>
                      </div>
                    </button>
                  )}

                  {!selectedShift.isApproved && selectedShift.status === "Completed" && !selectedShift.isInvoiced && (
                    <button 
                      onClick={() =>
                        performShiftAction(
                          selectedShift.id,
                          isAdminUser ? "admin_approve_timesheet" : "client_approve_timesheet"
                        )
                      }
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <div className="text-left">
                          <p className="font-medium text-sm text-emerald-500">Approve Timesheet</p>
                          <p className="text-xs text-emerald-500/70 mt-0.5">{isAdminUser ? "Admin approval for worked hours." : "Client/company approval for worked hours."}</p>
                        </div>
                      </div>
                    </button>
                  )}

                  {!selectedShift.isApproved && selectedShift.status === "Completed" && !selectedShift.isInvoiced && isAdminUser && (
                    <button
                      onClick={() => rejectTimesheet(selectedShift.id)}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                        <div className="text-left">
                          <p className="font-medium text-sm text-red-500">Reject Timesheet</p>
                          <p className="text-xs text-red-500/70 mt-0.5">Send it back for correction before finalizing.</p>
                        </div>
                      </div>
                    </button>
                  )}

                  {!selectedShift.isApproved && selectedShift.status === "Completed" && !selectedShift.isInvoiced && isClientUser && (
                    <button
                      onClick={() => flagShiftIssue(selectedShift.id)}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <FileWarning className="w-5 h-5 text-amber-500" />
                        <div className="text-left">
                          <p className="font-medium text-sm text-amber-500">Flag Issue</p>
                          <p className="text-xs text-amber-500/70 mt-0.5">Send a shift or hours issue to admin review.</p>
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
                          <p className="font-medium text-sm text-blue-500">Finalize Payment</p>
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
                          <p className="font-medium text-sm text-emerald-500">Mark Worker Paid</p>
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
                          <p className="font-medium text-sm text-primary">Mark Client Invoiced</p>
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
                          <p className="font-medium text-sm text-red-500">Resolve Operational Flag</p>
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
