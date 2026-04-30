"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, XCircle, FileText, Eye, AlertCircle, 
  X, Check, Send, ShieldAlert, UserCircle, ChevronRight, FileImage, Search
} from "lucide-react";

// Types
type Document = {
  id: string;
  type: string;
  submittedAt: Date;
  status: "Pending" | "Approved" | "Rejected" | "Expiring Soon" | "Expired";
  expiryDate?: string;
  fileUrl: string;
};

type WorkerWithDocs = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  documents: Document[];
};

// Initial Data grouped by Worker
const INITIAL_WORKERS: WorkerWithDocs[] = [];

export default function DocumentQueuePage() {
  const [workersData, setWorkersData] = useState<WorkerWithDocs[]>(INITIAL_WORKERS);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(INITIAL_WORKERS[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals State
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [approveDoc, setApproveDoc] = useState<{workerId: string, doc: Document} | null>(null);
  const [rejectDoc, setRejectDoc] = useState<{workerId: string, doc: Document} | null>(null);
  
  // Form State
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Derived filtered workers based on search
  const searchedWorkers = useMemo(() => {
    if (!searchQuery.trim()) return workersData;
    const query = searchQuery.toLowerCase();
    return workersData.filter(w => 
      w.name.toLowerCase().includes(query) || 
      w.email.toLowerCase().includes(query) || 
      w.phone.replace(/\D/g, '').includes(query.replace(/\D/g, ''))
    );
  }, [workersData, searchQuery]);

  const selectedWorker = searchedWorkers.find(w => w.id === selectedWorkerId) || null;

  // Derived groups
  const workersWithPending = searchedWorkers.filter(w => w.documents.some(d => d.status === "Pending"));
  const workersWithExpiry = searchedWorkers.filter(w => w.documents.some(d => d.status === "Expired" || d.status === "Expiring Soon"));

  // Actions
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleApprove = () => {
    if (!approveDoc) return;
    setWorkersData(workers => workers.map(w => {
      if (w.id === approveDoc.workerId) {
        return {
          ...w,
          documents: w.documents.map(d => d.id === approveDoc.doc.id ? { ...d, status: "Approved", expiryDate: "Apr 30, 2028" } : d)
        };
      }
      return w;
    }));
    const workerName = workersData.find(w => w.id === approveDoc.workerId)?.name;
    showNotification(`${approveDoc.doc.type} approved. SMS sent to ${workerName}.`, 'success');
    setApproveDoc(null);
    setApprovalNotes("");
  };

  const handleReject = () => {
    if (!rejectDoc || !rejectionReason.trim()) return;
    setWorkersData(workers => workers.map(w => {
      if (w.id === rejectDoc.workerId) {
        return {
          ...w,
          documents: w.documents.map(d => d.id === rejectDoc.doc.id ? { ...d, status: "Rejected" } : d)
        };
      }
      return w;
    }));
    const workerName = workersData.find(w => w.id === rejectDoc.workerId)?.name;
    showNotification(`Document rejected. Details sent to ${workerName}.`, 'error');
    setRejectDoc(null);
    setRejectionReason("");
  };

  const formatTimeAgo = (date: Date) => {
    const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative h-[calc(100vh-6rem)] flex flex-col">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-bold border ${
              notification.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 backdrop-blur-md' : 
              'bg-red-500/10 text-red-500 border-red-500/20 backdrop-blur-md'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Verification</h1>
          <p className="text-foreground/70 mt-1">Review worker submissions chronologically by profile to ensure compliance.</p>
        </div>
        
        {/* Global Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, or phone..." 
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-secondary rounded-xl text-sm focus:outline-none focus:border-primary transition-colors shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        
        {/* Left Pane: Worker List */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2 hide-scrollbar">
          
          {/* Pending Workers */}
          <div className="glass rounded-2xl bg-background/50 border border-secondary overflow-hidden flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-secondary/50 bg-secondary/10 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
              <h2 className="font-bold flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-primary" /> Pending Review
              </h2>
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">{workersWithPending.length}</span>
            </div>
            <div className="divide-y divide-secondary/30">
              {workersWithPending.map(worker => {
                const pendingCount = worker.documents.filter(d => d.status === "Pending").length;
                const isSelected = selectedWorkerId === worker.id;
                
                return (
                  <button 
                    key={worker.id}
                    onClick={() => setSelectedWorkerId(worker.id)}
                    className={`w-full text-left p-4 transition-colors flex items-center justify-between ${
                      isSelected ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-secondary/10 border-l-4 border-transparent'
                    }`}
                  >
                    <div>
                      <h3 className="font-bold">{worker.name}</h3>
                      <p className="text-xs text-foreground/70">{pendingCount} pending document{pendingCount > 1 ? 's' : ''}</p>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-foreground/30'}`} />
                  </button>
                );
              })}
              {workersWithPending.length === 0 && (
                <p className="p-6 text-center text-sm text-foreground/50">
                  {searchQuery ? "No matching workers found." : "No pending documents."}
                </p>
              )}
            </div>
          </div>

          {/* Attention Workers (Expiry) */}
          <div className="glass rounded-2xl bg-background/50 border border-secondary overflow-hidden flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-secondary/50 bg-red-500/5 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
              <h2 className="font-bold flex items-center gap-2 text-amber-500">
                <AlertCircle className="w-5 h-5" /> Expiry Alerts
              </h2>
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{workersWithExpiry.length}</span>
            </div>
            <div className="divide-y divide-secondary/30">
              {workersWithExpiry.map(worker => {
                const isSelected = selectedWorkerId === worker.id;
                const hasExpired = worker.documents.some(d => d.status === "Expired");
                
                return (
                  <button 
                    key={worker.id}
                    onClick={() => setSelectedWorkerId(worker.id)}
                    className={`w-full text-left p-4 transition-colors flex items-center justify-between ${
                      isSelected ? 'bg-secondary/20 border-l-4 border-amber-500' : 'hover:bg-secondary/10 border-l-4 border-transparent'
                    }`}
                  >
                    <div>
                      <h3 className="font-bold">{worker.name}</h3>
                      <p className={`text-xs font-bold ${hasExpired ? 'text-red-500' : 'text-amber-500'}`}>
                        {hasExpired ? "Auto-Restricted (Expired)" : "Expiring Soon"}
                      </p>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${isSelected ? 'text-amber-500' : 'text-foreground/30'}`} />
                  </button>
                );
              })}
              {workersWithExpiry.length === 0 && (
                <p className="p-6 text-center text-sm text-foreground/50">
                   {searchQuery ? "No matching workers found." : "No expiring documents."}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Pane: Selected Worker Details & Document Viewer */}
        <div className="w-full lg:w-2/3 glass rounded-2xl bg-background/50 border border-secondary flex flex-col overflow-hidden">
          {selectedWorker ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-secondary/50 bg-secondary/5 flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xl">
                    {selectedWorker.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedWorker.name}</h2>
                    <p className="text-sm text-foreground/70">{selectedWorker.email} • {selectedWorker.phone}</p>
                  </div>
                </div>
                <button className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                  View Full Profile <Eye className="w-4 h-4"/>
                </button>
              </div>

              {/* Document List for Selected Worker */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <h3 className="font-bold text-lg border-b border-secondary pb-2">Document Submissions</h3>
                
                {selectedWorker.documents.map(doc => (
                  <div key={doc.id} className={`p-5 rounded-2xl border flex flex-col xl:flex-row gap-6 ${
                    doc.status === "Pending" ? "bg-background border-secondary" :
                    doc.status === "Approved" ? "bg-emerald-500/5 border-emerald-500/20" :
                    doc.status === "Rejected" ? "bg-red-500/5 border-red-500/20" :
                    doc.status === "Expired" ? "bg-red-500/5 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]" :
                    "bg-amber-500/5 border-amber-500/20"
                  }`}>
                    {/* Doc Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-lg">{doc.type}</h4>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          doc.status === "Pending" ? "bg-secondary text-foreground" :
                          doc.status === "Approved" ? "bg-emerald-500 text-white" :
                          doc.status === "Rejected" ? "bg-red-500 text-white" :
                          doc.status === "Expired" ? "bg-red-500 text-white animate-pulse" :
                          "bg-amber-500 text-white"
                        }`}>
                          {doc.status}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/70 font-mono text-xs">{doc.id}</p>
                      <p className="text-sm">Submitted {formatTimeAgo(doc.submittedAt)}</p>
                      
                      {doc.expiryDate && (
                        <p className={`text-sm font-bold ${doc.status === "Expired" ? "text-red-500" : "text-amber-500"}`}>
                          Expiry: {doc.expiryDate}
                        </p>
                      )}

                      {/* Action Buttons */}
                      {doc.status === "Pending" && (
                        <div className="flex gap-2 mt-4 pt-4 border-t border-secondary/50">
                          <button onClick={() => setRejectDoc({workerId: selectedWorker.id, doc})} className="flex-1 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-sm font-bold transition-colors">
                            Reject
                          </button>
                          <button onClick={() => setApproveDoc({workerId: selectedWorker.id, doc})} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors">
                            Approve
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Doc Preview Thumbnail */}
                    <div className="w-full xl:w-48 aspect-video xl:aspect-square bg-secondary/20 rounded-xl border border-secondary flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/30 transition-colors relative group overflow-hidden" onClick={() => setPreviewDoc(doc)}>
                      <FileImage className="w-10 h-10 text-foreground/30 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-foreground/50 group-hover:text-foreground">Click to Enlarge</span>
                      
                      {/* Fake overlay mimicking a document image */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent mix-blend-overlay"></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-foreground/40">
              <UserCircle className="w-16 h-16 mb-4 opacity-50" />
              <p className="font-bold text-center">
                {searchQuery ? "No worker found matching your search." : "Select a worker to review documents"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* Preview Modal */}
      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPreviewDoc(null)} className="absolute inset-0 bg-background/90 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-4xl h-[90vh] bg-background border border-secondary rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              <div className="p-4 border-b border-secondary flex justify-between items-center bg-secondary/10">
                <h3 className="font-bold text-lg">{previewDoc.type}</h3>
                <button onClick={() => setPreviewDoc(null)} className="p-2 hover:bg-secondary rounded-full"><X className="w-5 h-5"/></button>
              </div>
              <div className="flex-1 overflow-auto flex items-center justify-center bg-secondary/5 p-8">
                {/* Massive Mock Image Placeholder */}
                <div className="w-full max-w-2xl bg-white border border-secondary rounded-xl shadow-xl flex flex-col items-center justify-center text-black min-h-[60vh]">
                  <FileText className="w-24 h-24 mb-6 text-gray-300" />
                  <p className="font-mono text-lg font-bold text-gray-400">DOCUMENT VIEWER RENDERER</p>
                  <p className="text-sm mt-2 text-gray-500 font-mono border border-gray-200 px-4 py-2 rounded bg-gray-50">{previewDoc.fileUrl}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Approve Modal */}
      <AnimatePresence>
        {approveDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-background border border-secondary rounded-2xl shadow-2xl p-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-1">Approve Document</h3>
              <p className="text-sm text-foreground/70 mb-6">You are approving the {approveDoc.doc.type}.</p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-foreground/70 mb-1">ADMIN NOTES (OPTIONAL)</label>
                  <textarea 
                    value={approvalNotes}
                    onChange={e => setApprovalNotes(e.target.value)}
                    placeholder="E.g., Verified registration number via portal."
                    className="w-full h-24 p-3 bg-background border border-secondary rounded-xl text-sm focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setApproveDoc(null)} className="flex-1 py-2.5 border border-secondary rounded-xl text-sm font-bold hover:bg-secondary/50">Cancel</button>
                <button onClick={handleApprove} className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> Approve Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-background border border-red-500/30 rounded-2xl shadow-2xl p-6">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
                <XCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-1 text-red-500">Reject Document</h3>
              <p className="text-sm text-foreground/70 mb-6">This will automatically notify the worker via SMS/Email to re-upload.</p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-red-500 mb-1">REJECTION REASON (MANDATORY)</label>
                  <textarea 
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="E.g., The registration number is blurry and unreadable. Please upload a clear photo."
                    className="w-full h-24 p-3 bg-background border border-red-500/30 rounded-xl text-sm focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setRejectDoc(null)} className="flex-1 py-2.5 border border-secondary rounded-xl text-sm font-bold hover:bg-secondary/50">Cancel</button>
                <button 
                  onClick={handleReject} 
                  disabled={!rejectionReason.trim()}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Send Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
