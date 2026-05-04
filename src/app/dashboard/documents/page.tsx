"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  AlertCircle,
  X,
  Check,
  Send,
  ShieldAlert,
  UserCircle,
  ChevronRight,
  FileImage,
  Search,
} from "lucide-react";

type DocStatus = "Pending" | "Approved" | "Rejected" | "Expiring Soon" | "Expired";

type DocumentRow = {
  id: string;
  type: string;
  submittedAt: string;
  status: DocStatus;
  expiryDate?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileData?: string;
  rejectionReason?: string;
  adminNotes?: string;
};

type WorkerWithDocs = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  documents: DocumentRow[];
  raw: Record<string, unknown>;
};

function normalizeWorker(w: Record<string, unknown>): WorkerWithDocs {
  const roles = Array.isArray(w.roles) ? (w.roles as string[]) : [];
  const docsRaw = Array.isArray(w.documents) ? (w.documents as Record<string, unknown>[]) : [];
  const wid = String(w.id || "");
  const documents: DocumentRow[] = docsRaw.map((d, idx) => {
    const uploaded = d.uploadedAt != null ? String(d.uploadedAt) : new Date().toISOString();
    const st = String(d.status || "Pending") as DocStatus;
    return {
      id: String(d.id || `${wid}-doc-${idx}`),
      type: String(d.type || "Document"),
      submittedAt: uploaded,
      status: ["Pending", "Approved", "Rejected", "Expiring Soon", "Expired"].includes(st) ? st : "Pending",
      expiryDate: d.expiryDate ? String(d.expiryDate) : undefined,
      fileName: d.fileName ? String(d.fileName) : undefined,
      fileType: d.fileType ? String(d.fileType) : undefined,
      fileSize: Number.isFinite(Number(d.fileSize)) ? Number(d.fileSize) : undefined,
      fileData: typeof d.fileData === "string" && d.fileData.startsWith("data:") ? d.fileData : undefined,
      rejectionReason: d.rejectionReason ? String(d.rejectionReason) : undefined,
      adminNotes: d.adminNotes ? String(d.adminNotes) : undefined,
    };
  });
  return {
    id: String(w.id || ""),
    name: String(w.name || ""),
    email: String(w.email || ""),
    phone: String(w.phone || ""),
    role: roles.length ? roles.join(", ") : "—",
    documents,
    raw: w,
  };
}

export default function DocumentQueuePage() {
  const [access, setAccess] = useState<"loading" | "admin" | "denied">("loading");
  const [workersData, setWorkersData] = useState<WorkerWithDocs[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [previewDoc, setPreviewDoc] = useState<DocumentRow | null>(null);
  const [approveDoc, setApproveDoc] = useState<{ workerId: string; doc: DocumentRow } | null>(null);
  const [rejectDoc, setRejectDoc] = useState<{ workerId: string; doc: DocumentRow } | null>(null);

  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [saving, setSaving] = useState(false);

  const refreshWorkers = useCallback(async () => {
    setLoadError(null);
    const meRes = await fetch("/api/me", { cache: "no-store" });
    if (!meRes.ok) {
      setAccess("denied");
      return;
    }
    const me = await meRes.json();
    if (me.role !== "admin" && me.role !== "super_admin") {
      setAccess("denied");
      return;
    }
    setAccess("admin");
    const res = await fetch("/api/workers", { cache: "no-store" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setLoadError(err.error || "Unable to load workers");
      setWorkersData([]);
      return;
    }
    const data = await res.json();
    const list = Array.isArray(data) ? data.map((w: Record<string, unknown>) => normalizeWorker(w)) : [];
    setWorkersData(list);
    setSelectedWorkerId((prev) => {
      if (prev && list.some((w) => w.id === prev)) return prev;
      return list[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    void refreshWorkers();
  }, [refreshWorkers]);

  const searchedWorkers = useMemo(() => {
    if (!searchQuery.trim()) return workersData;
    const query = searchQuery.toLowerCase();
    return workersData.filter(
      (w) =>
        w.name.toLowerCase().includes(query) ||
        w.email.toLowerCase().includes(query) ||
        w.phone.replace(/\D/g, "").includes(query.replace(/\D/g, "")),
    );
  }, [workersData, searchQuery]);

  const selectedWorker = searchedWorkers.find((w) => w.id === selectedWorkerId) || null;

  const workersWithPending = searchedWorkers.filter((w) => w.documents.some((d) => d.status === "Pending"));
  const workersWithExpiry = searchedWorkers.filter((w) =>
    w.documents.some((d) => d.status === "Expired" || d.status === "Expiring Soon"),
  );

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const persistWorker = async (workerId: string, nextDocs: DocumentRow[]) => {
    const row = workersData.find((w) => w.id === workerId);
    if (!row) return;
    setSaving(true);
    try {
      const payload = {
        ...row.raw,
        id: workerId,
        documents: nextDocs.map((d) => ({
          id: d.id,
          type: d.type,
          fileName: d.fileName || "",
          fileType: d.fileType || "",
          fileSize: d.fileSize || 0,
          ...(d.fileData ? { fileData: d.fileData } : {}),
          uploadedAt: d.submittedAt,
          status: d.status,
          ...(d.expiryDate ? { expiryDate: d.expiryDate } : {}),
          ...(d.rejectionReason ? { rejectionReason: d.rejectionReason } : {}),
          ...(d.adminNotes ? { adminNotes: d.adminNotes } : {}),
        })),
      };
      const res = await fetch("/api/workers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showNotification(err.error || "Failed to save", "error");
        return;
      }
      const updated = await res.json();
      setWorkersData((prev) =>
        prev.map((w) => (w.id === workerId ? normalizeWorker(updated as Record<string, unknown>) : w)),
      );
    } catch {
      showNotification("Save failed. Try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!approveDoc) return;
    const { workerId, doc } = approveDoc;
    const worker = workersData.find((w) => w.id === workerId);
    if (!worker) return;
    const nextDocs = worker.documents.map((d) =>
      d.id === doc.id
        ? {
            ...d,
            status: "Approved" as const,
            adminNotes: approvalNotes.trim() || d.adminNotes,
            rejectionReason: undefined,
          }
        : d,
    );
    await persistWorker(workerId, nextDocs);
    showNotification(`${doc.type} approved for ${worker.name}.`, "success");
    setApproveDoc(null);
    setApprovalNotes("");
  };

  const handleReject = async () => {
    if (!rejectDoc || !rejectionReason.trim()) return;
    const { workerId, doc } = rejectDoc;
    const worker = workersData.find((w) => w.id === workerId);
    if (!worker) return;
    const nextDocs = worker.documents.map((d) =>
      d.id === doc.id
        ? {
            ...d,
            status: "Rejected" as const,
            rejectionReason: rejectionReason.trim(),
          }
        : d,
    );
    await persistWorker(workerId, nextDocs);
    showNotification(`Document rejected. Worker can re-upload.`, "error");
    setRejectDoc(null);
    setRejectionReason("");
  };

  const formatSubmitted = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  if (access === "loading") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (access === "denied") {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-2xl border border-secondary bg-background/80 text-center">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Admin only</h1>
        <p className="text-foreground/70 text-sm">Document verification is only available to platform administrators.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative h-[calc(100vh-6rem)] flex flex-col">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-bold border ${
              notification.type === "success"
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 backdrop-blur-md"
                : "bg-red-500/10 text-red-500 border-red-500/20 backdrop-blur-md"
            }`}
          >
            {notification.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Verification</h1>
          <p className="text-foreground/70 mt-1">
            MVP: review worker uploads, approve or reject with a reason. Changes save to worker records.
          </p>
          {loadError && (
            <p className="mt-2 text-sm font-bold text-red-500">{loadError}</p>
          )}
        </div>

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
        <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2 hide-scrollbar">
          <div className="glass rounded-2xl bg-background/50 border border-secondary overflow-hidden flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-secondary/50 bg-secondary/10 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
              <h2 className="font-bold flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-primary" /> Pending Review
              </h2>
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {workersWithPending.length}
              </span>
            </div>
            <div className="divide-y divide-secondary/30">
              {workersWithPending.map((worker) => {
                const pendingCount = worker.documents.filter((d) => d.status === "Pending").length;
                const isSelected = selectedWorkerId === worker.id;
                return (
                  <button
                    key={worker.id}
                    type="button"
                    onClick={() => setSelectedWorkerId(worker.id)}
                    className={`w-full text-left p-4 transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-primary/10 border-l-4 border-primary"
                        : "hover:bg-secondary/10 border-l-4 border-transparent"
                    }`}
                  >
                    <div>
                      <h3 className="font-bold">{worker.name}</h3>
                      <p className="text-xs text-foreground/70">
                        {pendingCount} pending document{pendingCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${isSelected ? "text-primary" : "text-foreground/30"}`} />
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

          <div className="glass rounded-2xl bg-background/50 border border-secondary overflow-hidden flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-secondary/50 bg-red-500/5 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
              <h2 className="font-bold flex items-center gap-2 text-amber-500">
                <AlertCircle className="w-5 h-5" /> Expiry Alerts
              </h2>
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {workersWithExpiry.length}
              </span>
            </div>
            <div className="divide-y divide-secondary/30">
              {workersWithExpiry.map((worker) => {
                const isSelected = selectedWorkerId === worker.id;
                const hasExpired = worker.documents.some((d) => d.status === "Expired");
                return (
                  <button
                    key={worker.id}
                    type="button"
                    onClick={() => setSelectedWorkerId(worker.id)}
                    className={`w-full text-left p-4 transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-secondary/20 border-l-4 border-amber-500"
                        : "hover:bg-secondary/10 border-l-4 border-transparent"
                    }`}
                  >
                    <div>
                      <h3 className="font-bold">{worker.name}</h3>
                      <p className={`text-xs font-bold ${hasExpired ? "text-red-500" : "text-amber-500"}`}>
                        {hasExpired ? "Expired document" : "Expiring soon"}
                      </p>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${isSelected ? "text-amber-500" : "text-foreground/30"}`} />
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

        <div className="w-full lg:w-2/3 glass rounded-2xl bg-background/50 border border-secondary flex flex-col overflow-hidden">
          {selectedWorker ? (
            <>
              <div className="p-6 border-b border-secondary/50 bg-secondary/5 flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xl">
                    {selectedWorker.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedWorker.name}</h2>
                    <p className="text-sm text-foreground/70">
                      {selectedWorker.email} • {selectedWorker.phone}
                    </p>
                    <p className="text-xs text-foreground/50 mt-1">Roles: {selectedWorker.role}</p>
                  </div>
                </div>
                <Link
                  href="/dashboard/workers"
                  className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
                >
                  View in Workers <Eye className="w-4 h-4" />
                </Link>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <h3 className="font-bold text-lg border-b border-secondary pb-2">Document Submissions</h3>
                {selectedWorker.documents.length === 0 && (
                  <p className="text-sm text-foreground/50">No documents uploaded yet.</p>
                )}
                {selectedWorker.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-5 rounded-2xl border flex flex-col xl:flex-row gap-6 ${
                      doc.status === "Pending"
                        ? "bg-background border-secondary"
                        : doc.status === "Approved"
                          ? "bg-emerald-500/5 border-emerald-500/20"
                          : doc.status === "Rejected"
                            ? "bg-red-500/5 border-red-500/20"
                            : doc.status === "Expired"
                              ? "bg-red-500/5 border-red-500/40"
                              : "bg-amber-500/5 border-amber-500/20"
                    }`}
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-lg">{doc.type}</h4>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            doc.status === "Pending"
                              ? "bg-secondary text-foreground"
                              : doc.status === "Approved"
                                ? "bg-emerald-500 text-white"
                                : doc.status === "Rejected"
                                  ? "bg-red-500 text-white"
                                  : doc.status === "Expired"
                                    ? "bg-red-500 text-white animate-pulse"
                                    : "bg-amber-500 text-white"
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/70 font-mono text-xs">{doc.id}</p>
                      {doc.fileName && <p className="text-sm text-foreground/70">File: {doc.fileName}</p>}
                      <p className="text-sm">Submitted {formatSubmitted(doc.submittedAt)}</p>
                      {doc.rejectionReason && (
                        <p className="text-sm font-bold text-red-500">Reason: {doc.rejectionReason}</p>
                      )}
                      {doc.expiryDate && (
                        <p
                          className={`text-sm font-bold ${doc.status === "Expired" ? "text-red-500" : "text-amber-500"}`}
                        >
                          Expiry: {doc.expiryDate}
                        </p>
                      )}
                      {doc.status === "Pending" && (
                        <div className="flex gap-2 mt-4 pt-4 border-t border-secondary/50">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setRejectDoc({ workerId: selectedWorker.id, doc })}
                            className="flex-1 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setApproveDoc({ workerId: selectedWorker.id, doc })}
                            className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="w-full xl:w-48 aspect-video xl:aspect-square bg-secondary/20 rounded-xl border border-secondary flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/30 transition-colors relative group overflow-hidden text-left"
                      onClick={() => setPreviewDoc(doc)}
                    >
                      <FileImage className="w-10 h-10 text-foreground/30 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-foreground/50 group-hover:text-foreground">Preview</span>
                    </button>
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

      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewDoc(null)}
              className="absolute inset-0 bg-background/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl h-[90vh] bg-background border border-secondary rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-secondary flex justify-between items-center bg-secondary/10">
                <h3 className="font-bold text-lg">{previewDoc.type}</h3>
                <button type="button" onClick={() => setPreviewDoc(null)} className="p-2 hover:bg-secondary rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto flex items-center justify-center bg-secondary/5 p-8">
                {previewDoc.fileData && previewDoc.fileType?.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element -- MVP document previews use data URLs from JSONB/local JSON, not routable static assets.
                  <img
                    src={previewDoc.fileData}
                    alt={previewDoc.fileName || previewDoc.type}
                    className="max-w-full max-h-full rounded-xl border border-secondary shadow-xl bg-white object-contain"
                  />
                ) : previewDoc.fileData && previewDoc.fileType === "application/pdf" ? (
                  <object
                    data={previewDoc.fileData}
                    type="application/pdf"
                    className="w-full h-full min-h-[70vh] rounded-xl border border-secondary bg-white"
                  >
                    <div className="w-full max-w-2xl bg-white border border-secondary rounded-xl shadow-xl flex flex-col items-center justify-center text-black min-h-[40vh] p-8">
                      <FileText className="w-24 h-24 mb-6 text-gray-300" />
                      <p className="font-mono text-sm font-bold text-gray-600 text-center">PDF preview is not available in this browser.</p>
                    </div>
                  </object>
                ) : (
                  <div className="w-full max-w-2xl bg-white border border-secondary rounded-xl shadow-xl flex flex-col items-center justify-center text-black min-h-[40vh] p-8">
                    <FileText className="w-24 h-24 mb-6 text-gray-300" />
                    <p className="font-mono text-sm font-bold text-gray-600 text-center">
                      Preview is available for uploaded images and PDFs. This document is stored for admin review by name and metadata.
                    </p>
                    <p className="text-sm mt-4 text-gray-500 font-mono border border-gray-200 px-4 py-2 rounded bg-gray-50 break-all">
                      {previewDoc.fileName || previewDoc.id}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {approveDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-background border border-secondary rounded-2xl shadow-2xl p-6"
            >
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
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="E.g., Verified registration number via portal."
                    className="w-full h-24 p-3 bg-background border border-secondary rounded-xl text-sm focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setApproveDoc(null)}
                  className="flex-1 py-2.5 border border-secondary rounded-xl text-sm font-bold hover:bg-secondary/50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleApprove()}
                  className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> Approve Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rejectDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-background border border-red-500/30 rounded-2xl shadow-2xl p-6"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
                <XCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-1 text-red-500">Reject Document</h3>
              <p className="text-sm text-foreground/70 mb-6">The worker will see the rejection reason and can upload again.</p>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-red-500 mb-1">REJECTION REASON (MANDATORY)</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="E.g., The photo is unreadable. Please upload a clearer image."
                    className="w-full h-24 p-3 bg-background border border-red-500/30 rounded-xl text-sm focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRejectDoc(null)}
                  className="flex-1 py-2.5 border border-secondary rounded-xl text-sm font-bold hover:bg-secondary/50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleReject()}
                  disabled={!rejectionReason.trim() || saving}
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
