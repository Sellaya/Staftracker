"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CalendarDays, Search, Filter, MapPin, X, 
  Clock, UserCircle, AlertTriangle, CheckCircle2, 
  Navigation, RefreshCcw, Ban, Edit3, Flag, Check
} from "lucide-react";

// Types
type ShiftStatus = "Upcoming" | "Active" | "Completed" | "Cancelled";

type Shift = {
  id: string;
  clientName: string;
  venueName: string;
  role: string;
  date: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: ShiftStatus;
  workerName?: string;
  workerId?: string;
  actualCheckIn?: string;
  actualCheckOut?: string;
  gpsStatus: "Verified" | "Out of Bounds" | "Pending";
  isFlagged: boolean;
  flagReason?: string;
};

// Mock Data
const INITIAL_SHIFTS: Shift[] = [];

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>(INITIAL_SHIFTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("All"); 
  
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  
  // Override States
  const [editingTimes, setEditingTimes] = useState(false);
  const [tempCheckIn, setTempCheckIn] = useState("");
  const [tempCheckOut, setTempCheckOut] = useState("");

  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");

  // Derived State
  const filteredShifts = useMemo(() => {
    return shifts.filter(s => {
      const matchesSearch = s.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            s.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (s.workerName && s.workerName.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;

      if (filter === "All") return true;
      if (filter === "Active") return s.status === "Active";
      if (filter === "Upcoming") return s.status === "Upcoming";
      if (filter === "Completed") return s.status === "Completed";
      if (filter === "Flagged") return s.isFlagged;
      
      return true;
    });
  }, [shifts, searchQuery, filter]);

  const selectedShift = shifts.find(s => s.id === selectedShiftId);

  // Actions
  const cancelShift = (id: string) => {
    setShifts(shifts.map(s => s.id === id ? { ...s, status: "Cancelled", workerName: undefined, workerId: undefined } : s));
    setSelectedShiftId(null);
  };

  const reassignWorker = (id: string) => {
    // Mocking reassignment
    setShifts(shifts.map(s => s.id === id ? { ...s, workerName: "Pending New Assignment", workerId: undefined, gpsStatus: "Pending", actualCheckIn: undefined } : s));
  };

  const submitFlag = () => {
    if (!selectedShift || !flagReason.trim()) return;
    setShifts(shifts.map(s => s.id === selectedShift.id ? { ...s, isFlagged: true, flagReason } : s));
    setFlagModalOpen(false);
    setFlagReason("");
  };

  const resolveFlag = (id: string) => {
    setShifts(shifts.map(s => s.id === id ? { ...s, isFlagged: false, flagReason: undefined } : s));
  };

  const saveTimeOverride = () => {
    if (!selectedShift) return;
    setShifts(shifts.map(s => {
      if (s.id === selectedShift.id) {
        return { 
          ...s, 
          actualCheckIn: tempCheckIn || s.actualCheckIn, 
          actualCheckOut: tempCheckOut || s.actualCheckOut,
          gpsStatus: "Verified" // Overriding inherently verifies the manual entry
        };
      }
      return s;
    }));
    setEditingTimes(false);
  };

  const startTimeEdit = () => {
    if (!selectedShift) return;
    setTempCheckIn(selectedShift.actualCheckIn || selectedShift.scheduledStart);
    setTempCheckOut(selectedShift.actualCheckOut || selectedShift.scheduledEnd);
    setEditingTimes(true);
  };

  const getStatusColor = (status: ShiftStatus) => {
    switch (status) {
      case "Active": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "Upcoming": return "bg-primary/10 text-primary border-primary/20";
      case "Completed": return "bg-secondary text-foreground border-secondary/50";
      case "Cancelled": return "bg-red-500/10 text-red-500 border-red-500/20";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shift Oversight</h1>
          <p className="text-foreground/70 mt-1">Monitor live field operations, check-ins, and resolve shift disputes.</p>
        </div>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all">
          + Create Shift
        </button>
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
                <th className="px-6 py-4 font-medium">Worker Status</th>
                <th className="px-6 py-4 font-medium">GPS Check-in</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
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
                        <p className="font-semibold group-hover:text-primary transition-colors flex items-center gap-2">
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
                    {shift.workerName ? (
                      <div>
                        <p className="font-medium text-foreground/80 flex items-center gap-1">
                          <UserCircle className="w-4 h-4 text-primary" /> {shift.workerName}
                        </p>
                        <p className={`text-xs mt-0.5 ${shift.status === "Upcoming" ? "text-amber-500" : "text-emerald-500"}`}>
                          {shift.status === "Active" ? `Checked in at ${shift.actualCheckIn}` : shift.status}
                        </p>
                      </div>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {shift.gpsStatus === "Verified" && (
                      <span className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
                        <MapPin className="w-3.5 h-3.5" /> Verified
                      </span>
                    )}
                    {shift.gpsStatus === "Out of Bounds" && (
                      <span className="flex items-center gap-1 text-red-500 text-xs font-bold">
                        <MapPin className="w-3.5 h-3.5" /> Out of Bounds
                      </span>
                    )}
                    {shift.gpsStatus === "Pending" && (
                      <span className="text-foreground/40 text-xs font-medium">Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-primary text-xs font-bold hover:underline">Oversight</button>
                  </td>
                </motion.tr>
              ))}
              {filteredShifts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-foreground/50">
                    No shifts found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Panel Overlay for Shift Profile */}
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
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-background border-l border-secondary shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              {/* Panel Header */}
              <div className="p-6 border-b border-secondary flex justify-between items-start bg-secondary/5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(selectedShift.status)}`}>
                      {selectedShift.status}
                    </span>
                    <span className="text-xs font-mono text-foreground/50">{selectedShift.id}</span>
                  </div>
                  <h2 className="text-2xl font-bold">{selectedShift.role} Shift</h2>
                  <p className="text-foreground/70 text-sm mt-1">{selectedShift.clientName} • {selectedShift.venueName}</p>
                </div>
                <button onClick={() => { setSelectedShiftId(null); setEditingTimes(false); }} className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* Warning Banner if Flagged */}
                {selectedShift.isFlagged && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-red-500">Shift Flagged for Review</h4>
                      <p className="text-sm text-red-500/80 mt-1">{selectedShift.flagReason}</p>
                      <button 
                        onClick={() => resolveFlag(selectedShift.id)}
                        className="mt-3 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded hover:bg-red-600 transition-colors"
                      >
                        Resolve Issue
                      </button>
                    </div>
                  </div>
                )}

                {/* Worker Assignment & GPS */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg border-b border-secondary pb-2 flex justify-between items-center">
                    Worker Status
                    {selectedShift.status !== "Completed" && selectedShift.status !== "Cancelled" && (
                      <button 
                        onClick={() => reassignWorker(selectedShift.id)}
                        className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1"
                      >
                        <RefreshCcw className="w-3 h-3"/> Reassign Worker
                      </button>
                    )}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-secondary bg-secondary/5 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <UserCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground/50 mb-0.5">ASSIGNED TO</p>
                        <p className="font-bold text-sm">{selectedShift.workerName || "Unassigned"}</p>
                        {selectedShift.workerId && <p className="text-xs font-mono text-foreground/50">{selectedShift.workerId}</p>}
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border flex flex-col justify-center ${
                      selectedShift.gpsStatus === "Verified" ? "bg-emerald-500/5 border-emerald-500/20" :
                      selectedShift.gpsStatus === "Out of Bounds" ? "bg-red-500/5 border-red-500/20" : "bg-secondary/10 border-secondary/50"
                    }`}>
                      <p className="text-xs font-bold text-foreground/50 mb-1">GPS CHECK-IN STATUS</p>
                      <div className="flex items-center gap-2">
                        <Navigation className={`w-4 h-4 ${
                          selectedShift.gpsStatus === "Verified" ? "text-emerald-500" :
                          selectedShift.gpsStatus === "Out of Bounds" ? "text-red-500" : "text-foreground/50"
                        }`} />
                        <span className={`font-bold text-sm ${
                          selectedShift.gpsStatus === "Verified" ? "text-emerald-500" :
                          selectedShift.gpsStatus === "Out of Bounds" ? "text-red-500" : "text-foreground/70"
                        }`}>
                          {selectedShift.gpsStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mock Live Map */}
                  {(selectedShift.status === "Active" || selectedShift.gpsStatus === "Out of Bounds") && (
                    <div className="w-full h-48 rounded-xl bg-secondary/20 border border-secondary relative overflow-hidden flex items-center justify-center group cursor-pointer">
                      <div className="absolute inset-0 bg-primary/5 pattern-dots pattern-secondary pattern-opacity-20 pattern-size-4"></div>
                      <div className="relative flex flex-col items-center">
                        <MapPin className={`w-8 h-8 mb-2 ${selectedShift.gpsStatus === "Out of Bounds" ? "text-red-500" : "text-primary"}`} />
                        <span className="text-xs font-bold text-foreground/70 bg-background/80 px-3 py-1 rounded-full backdrop-blur-sm border border-secondary">
                          Live Location Telemetry (Mock)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timesheet & Overrides */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-secondary pb-2">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" /> Timesheet Control
                    </h3>
                    {!editingTimes && selectedShift.workerName && selectedShift.status !== "Cancelled" && (
                      <button onClick={startTimeEdit} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                        Override Times <Edit3 className="w-3 h-3"/>
                      </button>
                    )}
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

                    {/* Edit Form */}
                    {editingTimes && (
                      <div className="pt-4 border-t border-secondary/50 animate-in fade-in slide-in-from-top-2">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
                          <p className="text-xs font-bold text-amber-500 flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3" /> Manual Override
                          </p>
                          <p className="text-xs text-amber-500/80 mt-1">
                            Overriding these times will bypass the worker's GPS check-in requirement and calculate billing based on these manual inputs.
                          </p>
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-foreground/70 mb-1">OVERRIDE CHECK-IN</label>
                            <input 
                              type="time" 
                              value={tempCheckIn}
                              onChange={e => setTempCheckIn(e.target.value)}
                              className="w-full px-3 py-2 bg-background border border-primary rounded-lg text-sm focus:outline-none"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-foreground/70 mb-1">OVERRIDE CHECK-OUT</label>
                            <input 
                              type="time" 
                              value={tempCheckOut}
                              onChange={e => setTempCheckOut(e.target.value)}
                              className="w-full px-3 py-2 bg-background border border-primary rounded-lg text-sm focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingTimes(false)} className="px-3 py-1.5 border border-secondary rounded text-sm font-bold hover:bg-secondary/50">Cancel</button>
                          <button onClick={saveTimeOverride} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-bold shadow-lg hover:bg-primary/90">Save Override</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="pt-4 space-y-3">
                  <h3 className="text-xs font-bold text-foreground/50 mb-2">ADMINISTRATIVE ACTIONS</h3>
                  
                  {!selectedShift.isFlagged && selectedShift.status !== "Cancelled" && (
                    <button 
                      onClick={() => setFlagModalOpen(true)}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-secondary bg-background hover:border-amber-500 hover:bg-amber-500/5 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Flag className="w-5 h-5 text-amber-500" />
                        <div className="text-left">
                          <p className="font-bold text-sm text-foreground group-hover:text-amber-500 transition-colors">Flag Shift for Issues</p>
                          <p className="text-xs text-foreground/50 mt-0.5">Late arrival, early departure, or client complaint.</p>
                        </div>
                      </div>
                    </button>
                  )}

                  {selectedShift.status !== "Cancelled" && selectedShift.status !== "Completed" && (
                    <button 
                      onClick={() => cancelShift(selectedShift.id)}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-secondary bg-background hover:border-red-500 hover:bg-red-500/5 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Ban className="w-5 h-5 text-red-500" />
                        <div className="text-left">
                          <p className="font-bold text-sm text-foreground group-hover:text-red-500 transition-colors">Cancel Entire Shift</p>
                          <p className="text-xs text-foreground/50 mt-0.5">Instantly notifies worker and client. Irreversible.</p>
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

      {/* Flag Modal */}
      <AnimatePresence>
        {flagModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-background border border-amber-500/30 rounded-2xl shadow-2xl p-6">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                <Flag className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-1 text-amber-500">Flag Shift Problem</h3>
              <p className="text-sm text-foreground/70 mb-6">Describe the issue. This will highlight the shift in the dashboard for further review.</p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-amber-500 mb-1">REASON / INCIDENT REPORT</label>
                  <textarea 
                    value={flagReason}
                    onChange={e => setFlagReason(e.target.value)}
                    placeholder="E.g., Client called to complain worker arrived 30 minutes late."
                    className="w-full h-24 p-3 bg-background border border-amber-500/30 rounded-xl text-sm focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setFlagModalOpen(false)} className="flex-1 py-2.5 border border-secondary rounded-xl text-sm font-bold hover:bg-secondary/50">Cancel</button>
                <button 
                  onClick={submitFlag} 
                  disabled={!flagReason.trim()}
                  className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Flag Shift
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
