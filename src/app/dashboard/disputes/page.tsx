"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertTriangle, Search, Filter, ShieldAlert, FileText, 
  UserX, Clock, MessageSquare, CheckCircle2, X, ChevronRight, 
  Scale, MessageCircle, DollarSign, MapPin, AlertCircle
} from "lucide-react";

type DisputeStatus = "Open" | "Investigating" | "Resolved";
type Priority = "High" | "Medium" | "Low";
type DisputeType = "Pay Discrepancy" | "No-Show" | "Misconduct" | "System Flag";

type Dispute = {
  id: string;
  shiftId: string;
  type: DisputeType;
  status: DisputeStatus;
  priority: Priority;
  reportedBy: "Client" | "Worker" | "System";
  workerName: string;
  workerId: string;
  clientName: string;
  venueName: string;
  dateReported: string;
  description: string;
  systemNotes?: string;
  resolution?: string;
};

const MOCK_DISPUTES: Dispute[] = [];

export default function DisputesManagement() {
  const [disputes, setDisputes] = useState<Dispute[]>(MOCK_DISPUTES);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<DisputeStatus | "All">("All");
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  
  const [resolutionText, setResolutionText] = useState("");

  const selectedDispute = disputes.find(d => d.id === selectedDisputeId);

  const filteredDisputes = disputes.filter(d => {
    const matchesSearch = d.workerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filter === "All") return true;
    return d.status === filter;
  });

  const handleResolve = () => {
    if (!selectedDisputeId) return;
    if (!resolutionText.trim()) {
      console.error("Please provide resolution notes before closing the dispute.");
      return;
    }
    
    setDisputes(disputes.map(d => 
      d.id === selectedDisputeId 
        ? { ...d, status: "Resolved", resolution: resolutionText } 
        : d
    ));
    setResolutionText("");
  };

  const getPriorityColor = (priority: Priority) => {
    switch(priority) {
      case "High": return "text-red-500 bg-red-500/10 border-red-500/20";
      case "Medium": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "Low": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    }
  };

  const getTypeIcon = (type: DisputeType) => {
    switch(type) {
      case "Pay Discrepancy": return <DollarSign className="w-5 h-5" />;
      case "No-Show": return <UserX className="w-5 h-5" />;
      case "Misconduct": return <ShieldAlert className="w-5 h-5" />;
      case "System Flag": return <AlertCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Disputes & Resolutions</h1>
          <p className="text-foreground/70 mt-1">Investigate conflicts, analyze system flags, and resolve issues.</p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-bold text-red-500 text-sm">{disputes.filter(d => d.status === "Open" && d.priority === "High").length} Action Required</span>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl bg-background/50 border border-secondary flex flex-col overflow-hidden">
        <div className="p-4 border-b border-secondary/50 flex flex-col md:flex-row gap-4 justify-between items-center bg-secondary/10">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, Worker, or Client..." 
              className="w-full pl-10 pr-4 py-2 bg-background border border-secondary rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {(["All", "Open", "Investigating", "Resolved"] as const).map(f => (
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
                <th className="px-6 py-4 font-medium">Dispute Details</th>
                <th className="px-6 py-4 font-medium">Parties Involved</th>
                <th className="px-6 py-4 font-medium">Reported By</th>
                <th className="px-6 py-4 font-medium">Priority</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDisputes.map((dispute, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  key={dispute.id} 
                  onClick={() => setSelectedDisputeId(dispute.id)}
                  className="border-b border-secondary/20 hover:bg-secondary/10 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-secondary/30 text-foreground/70 group-hover:text-primary transition-colors`}>
                        {getTypeIcon(dispute.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold group-hover:text-primary transition-colors text-base">{dispute.type}</p>
                          <span className="text-[10px] font-mono text-foreground/40">{dispute.id}</span>
                        </div>
                        <p className="text-xs text-foreground/70 truncate max-w-[200px] mt-0.5">{dispute.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold">{dispute.workerName}</p>
                    <p className="text-xs text-foreground/50">{dispute.clientName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-secondary rounded text-xs font-bold uppercase tracking-wider">{dispute.reportedBy}</span>
                    <p className="text-[10px] text-foreground/40 mt-1">{dispute.dateReported}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-black uppercase tracking-wider border ${getPriorityColor(dispute.priority)}`}>
                      {dispute.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      dispute.status === "Open" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                      dispute.status === "Investigating" ? "bg-primary/10 text-primary border-primary/20" : 
                      "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    }`}>
                      {dispute.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
              {filteredDisputes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-foreground/50">
                    No disputes match your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISPUTE DETAILS PANEL */}
      <AnimatePresence>
        {selectedDispute && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDisputeId(null)}
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
                <div className="w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-foreground/50 font-mono tracking-wider">{selectedDispute.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getPriorityColor(selectedDispute.priority)}`}>
                      {selectedDispute.priority} Priority
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                      selectedDispute.status === "Open" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                      selectedDispute.status === "Investigating" ? "bg-primary/10 text-primary border-primary/20" : 
                      "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    }`}>
                      {selectedDispute.status}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black flex items-center gap-2 mt-1">
                    {getTypeIcon(selectedDispute.type)} {selectedDispute.type}
                  </h2>
                </div>
                <button onClick={() => setSelectedDisputeId(null)} className="p-2 hover:bg-secondary rounded-full transition-colors ml-4 flex-shrink-0">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Details Card */}
                <div className="p-5 rounded-2xl border border-secondary bg-background glass space-y-4">
                  <h3 className="font-bold border-b border-secondary/50 pb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Incident Report
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-foreground/50 mb-1">DATE REPORTED</p>
                      <p className="font-medium">{selectedDispute.dateReported}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground/50 mb-1">REPORTED BY</p>
                      <span className="px-2 py-1 bg-secondary/50 rounded text-xs font-bold">{selectedDispute.reportedBy}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground/50 mb-1">DESCRIPTION</p>
                    <p className="text-sm leading-relaxed bg-secondary/10 p-3 rounded-lg border border-secondary/50">{selectedDispute.description}</p>
                  </div>
                  
                  {selectedDispute.systemNotes && (
                    <div>
                      <p className="text-xs font-bold text-primary mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> SYSTEM TELEMETRY NOTES
                      </p>
                      <p className="text-sm leading-relaxed bg-primary/5 text-primary border border-primary/20 p-3 rounded-lg font-medium">
                        {selectedDispute.systemNotes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Parties Involved */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-secondary bg-secondary/5">
                    <p className="text-xs font-bold text-foreground/50 mb-2 flex items-center gap-1"><Scale className="w-3 h-3" /> WORKER</p>
                    <p className="font-bold text-lg">{selectedDispute.workerName}</p>
                    <p className="text-xs text-foreground/50 font-mono mb-3">{selectedDispute.workerId}</p>
                    <button className="w-full py-2 bg-background border border-secondary rounded-lg text-xs font-bold hover:bg-secondary transition-colors flex items-center justify-center gap-2">
                      <MessageCircle className="w-3 h-3" /> Message Worker
                    </button>
                  </div>
                  <div className="p-4 rounded-xl border border-secondary bg-secondary/5">
                    <p className="text-xs font-bold text-foreground/50 mb-2 flex items-center gap-1"><Scale className="w-3 h-3" /> CLIENT</p>
                    <p className="font-bold text-lg truncate" title={selectedDispute.clientName}>{selectedDispute.clientName}</p>
                    <p className="text-xs text-foreground/50 truncate mb-3"><MapPin className="w-3 h-3 inline mr-1"/>{selectedDispute.venueName}</p>
                    <button className="w-full py-2 bg-background border border-secondary rounded-lg text-xs font-bold hover:bg-secondary transition-colors flex items-center justify-center gap-2">
                      <MessageCircle className="w-3 h-3" /> Message Client
                    </button>
                  </div>
                </div>

                {/* Resolution Section */}
                <div className="p-5 rounded-2xl border border-secondary bg-background glass">
                  <h3 className="font-bold border-b border-secondary/50 pb-2 mb-4 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-primary" /> Resolution & Action
                  </h3>
                  
                  {selectedDispute.status === "Resolved" ? (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                      <p className="text-xs font-bold text-emerald-500 mb-1 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> DISPUTE RESOLVED
                      </p>
                      <p className="text-sm font-medium">{selectedDispute.resolution}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-foreground/70 mb-1">ADMIN RESOLUTION NOTES</label>
                        <textarea 
                          value={resolutionText}
                          onChange={e => setResolutionText(e.target.value)}
                          placeholder="Detail the final ruling, any pay adjustments, or penalties applied..." 
                          className="w-full h-24 p-3 bg-secondary/10 border border-secondary rounded-xl text-sm resize-none focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <button className="flex-1 py-2.5 border border-secondary bg-background rounded-xl text-sm font-bold hover:bg-secondary transition-colors">
                          Adjust Pay
                        </button>
                        <button className="flex-1 py-2.5 border border-secondary bg-background rounded-xl text-sm font-bold hover:bg-secondary transition-colors">
                          Apply Penalty
                        </button>
                      </div>

                      <button 
                        onClick={handleResolve}
                        className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Mark as Resolved & Close
                      </button>
                    </div>
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
