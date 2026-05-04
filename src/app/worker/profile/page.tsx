"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { ShieldCheck, FileText, UploadCloud, AlertCircle, Trash2 } from "lucide-react";

type WorkerDocument = {
  id: string;
  type: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  fileData?: string;
  uploadedAt: string;
  status: "Pending" | "Approved" | "Rejected";
};

type WorkerProfile = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  legalStatus?: string;
  status?: string;
  documentStatus?: string;
  roles?: string[];
  neighborhoods?: string[];
  bio?: string;
  documents?: WorkerDocument[];
  smartServeHas?: boolean;
  foodHandlerHas?: boolean;
};

const COMMON_OPTIONAL_DOCS = ["SIN Proof", "Void Cheque", "WHMIS Certificate"];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function WorkerProfile() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [docType, setDocType] = useState("Government ID");
  const [customType, setCustomType] = useState("");
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingDeleteDoc, setPendingDeleteDoc] = useState<WorkerDocument | null>(null);

  const requiresWorkAuthorization = !["citizen", "pr", "permanent resident", "canadian citizen"]
    .includes((worker?.legalStatus || "").toLowerCase());
  const documents = useMemo(() => worker?.documents || [], [worker?.documents]);
  const requiredDocs = useMemo(
    () => [
      "Government ID",
      "Profile Photo",
      ...(requiresWorkAuthorization ? ["Proof of Work Authorization"] : []),
      ...(worker?.smartServeHas ? ["SmartServe Certificate"] : []),
      ...(worker?.foodHandlerHas ? ["Food Handler Certificate"] : []),
    ],
    [requiresWorkAuthorization, worker?.foodHandlerHas, worker?.smartServeHas],
  );
  const availableDocTypes = useMemo(
    () => Array.from(new Set([...requiredDocs, ...COMMON_OPTIONAL_DOCS])),
    [requiredDocs],
  );
  const uploadedTypes = useMemo(() => new Set(documents.map((d) => d.type)), [documents]);
  const missingDocs = useMemo(
    () => requiredDocs.filter((required) => !uploadedTypes.has(required)),
    [requiredDocs, uploadedTypes],
  );
  const accountStatus = worker?.status || "Pending";
  const documentStatus = worker?.documentStatus || "Pending";
  const isClearedForWork = accountStatus === "Active" && documentStatus === "Approved";

  useEffect(() => {
    const loadUser = async () => {
      const res = await fetch("/api/worker/profile", { cache: "no-store" });
      if (!res.ok) return;
      const profile = await res.json();
      setWorker(profile);
    };
    loadUser();
  }, []);

  const handleUpload = async () => {
    if (!worker) return;
    if (filesToUpload.length === 0) {
      setUploadError("Please select at least one file to upload.");
      return;
    }
    const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];
    for (const file of filesToUpload) {
      const lowerName = file.name.toLowerCase();
      const hasAllowedExt = allowedExtensions.some((ext) => lowerName.endsWith(ext));
      if (!hasAllowedExt) {
        setUploadError(`Unsupported file type: ${file.name}. Use PDF, JPG, PNG, DOC or DOCX.`);
        return;
      }
    }
    const maxBytes = 5 * 1024 * 1024;
    for (const file of filesToUpload) {
      if (file.size > maxBytes) {
        setUploadError(`File too large: ${file.name}. Maximum size is 5MB.`);
        return;
      }
    }
    setUploadError(null);
    setIsUploading(true);
    setUploadSuccess(null);
    const resolvedType = docType === "Other" ? customType.trim() : docType;
    if (!resolvedType) {
      setIsUploading(false);
      setUploadError("Please provide a document type.");
      return;
    }

    try {
      const now = Date.now();
      const newDocs: WorkerDocument[] = await Promise.all(
        filesToUpload.map(async (file, index) => ({
          id: `DOC-${worker.id}-${now}-${index}`,
          type: resolvedType,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          fileData: await fileToDataUrl(file),
          uploadedAt: new Date().toISOString(),
          status: "Pending",
        })),
      );
      const res = await fetch("/api/worker/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: [...newDocs, ...documents],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to upload document");
      }
      const updatedWorker = await res.json();
      setWorker(updatedWorker);
      setFilesToUpload([]);
      setCustomType("");
      setUploadSuccess(`${newDocs.length} document(s) uploaded as ${resolvedType}. Review pending.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!worker) return;
    setUploadError(null);
    setUploadSuccess(null);
    const nextDocs = documents.filter((doc) => doc.id !== docId);
    try {
      const res = await fetch("/api/worker/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: nextDocs }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete document");
      }
      const updatedWorker = await res.json();
      setWorker(updatedWorker);
      setUploadSuccess("Document deleted.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      setUploadError(message);
    }
  };

  const isSubmitDisabled = isUploading || filesToUpload.length === 0 || (docType === "Other" && !customType.trim());

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">My Profile</h1>
          <p className="text-foreground/70 mt-1">Manage your personal information and legal documents.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Personal Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="p-6 rounded-3xl border border-secondary bg-background/50 glass flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary text-3xl mb-4 border border-primary/20">
              {worker ? `${worker.firstName?.charAt(0) || ""}${worker.lastName?.charAt(0) || ""}` : "JD"}
            </div>
            <h2 className="text-xl font-medium">{worker ? `${worker.firstName || ""} ${worker.lastName || ""}`.trim() || worker.name : "John Doe"}</h2>
            <p className="text-sm text-foreground/50 font-mono mb-4">ID: {worker ? worker.id : "W-1005"}</p>
            
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
              isClearedForWork
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
            }`}>
              {isClearedForWork ? <ShieldCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {isClearedForWork ? "Cleared for Shifts" : "Approval Pending"}
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-secondary bg-background/50 glass space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground/50">ACCOUNT STATUS</label>
              <p className="font-medium">{accountStatus}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/50">DOCUMENT STATUS</label>
              <p className="font-medium">{documentStatus}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/50">EMAIL</label>
              <p className="font-medium">{worker?.email || "Not provided"}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/50">PHONE</label>
              <p className="font-medium">{worker?.phone || "Not provided"}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/50">ADDRESS</label>
              <p className="font-medium">{worker?.address || "Not provided"}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/50">LEGAL STATUS</label>
              <p className="font-medium">{worker?.legalStatus || "Not provided"}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/50">ROLES</label>
              <p className="font-medium">{worker?.roles?.length ? worker.roles.join(", ") : "Not provided"}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/50">SERVICE AREAS</label>
              <p className="font-medium">{worker?.neighborhoods?.length ? worker.neighborhoods.join(", ") : "Not provided"}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/50">BIO</label>
              <p className="font-medium">{worker?.bio || "Not provided"}</p>
            </div>
            <p className="text-xs text-foreground/50 mt-2">Profile details can be updated by company admin.</p>
          </div>
        </div>

        {/* Documents & Settings */}
        <div className="md:col-span-2 space-y-6">
          
          <div className="p-6 rounded-3xl border border-amber-500/30 bg-amber-500/5">
            <h3 className="text-lg font-medium text-amber-500 flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5" /> Required Documents Checklist
            </h3>
            {missingDocs.length > 0 ? (
              <div className="mb-4">
                <p className="text-sm text-foreground/70 mb-3">Please upload the missing documents below:</p>
                <ul className="space-y-1 text-sm font-medium text-amber-500">
                  {missingDocs.map((missing) => (
                    <li key={missing}>- {missing}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-emerald-600 font-medium mb-4">All required documents are uploaded. You can still upload additional files.</p>
            )}

            <div className="space-y-3">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none"
              >
                {availableDocTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
                <option value="Other">Other</option>
              </select>
              {docType === "Other" && (
                <input
                  type="text"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="Document name (e.g. WHMIS Certificate)"
                  className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none"
                />
              )}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-amber-500/30 rounded-xl p-6 text-center hover:bg-amber-500/10 transition-colors cursor-pointer"
              >
                <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6 text-amber-500" />
                </div>
                <label className="font-medium text-amber-500 cursor-pointer">
                  Choose Document(s)
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => setFilesToUpload(Array.from(e.target.files || []))}
                  />
                </label>
                <p className="text-xs text-amber-500/70 mt-1">PDF, JPG, PNG, DOC, DOCX (up to 5MB each)</p>
                {filesToUpload.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 justify-center">
                    {filesToUpload.map((file, idx) => (
                      <span key={`${file.name}-${idx}`} className="text-xs px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700">
                        {file.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {uploadSuccess && (
                <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-xl font-medium text-center">
                  {uploadSuccess}
                </div>
              )}
              {uploadError && (
                <div className="w-full py-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl font-medium text-center">
                  {uploadError}
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={isSubmitDisabled}
                className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? "Uploading..." : "Submit Document"}
              </button>
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-secondary bg-background/50 glass">
            <h3 className="text-lg font-medium mb-4">My Documents</h3>
            <div className="space-y-4">
              {documents.length === 0 ? (
                <p className="text-sm text-foreground/50 italic">No documents uploaded yet.</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border border-secondary rounded-xl bg-secondary/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium">{doc.type}</p>
                        <p className="text-xs text-foreground/50">{doc.fileName}</p>
                        <p className="text-xs text-foreground/50">Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${
                      doc.status === "Approved"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : doc.status === "Rejected"
                          ? "bg-red-500/10 text-red-500 border-red-500/20"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    }`}>
                      {doc.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteDoc(doc)}
                      className="ml-3 p-2 rounded-lg text-red-500 hover:bg-red-500/10 border border-red-500/20"
                      aria-label={`Delete ${doc.type}`}
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
      {pendingDeleteDoc && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-secondary bg-card p-6 space-y-4">
            <h4 className="text-lg font-medium">Confirm deletion</h4>
            <p className="text-sm text-foreground/70">
              Delete <span className="font-medium">{pendingDeleteDoc.fileName}</span> from your account?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteDoc(null)}
                className="px-4 py-2 border border-secondary rounded-lg font-medium hover:bg-secondary/50"
              >
                No
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleDeleteDocument(pendingDeleteDoc.id);
                  setPendingDeleteDoc(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
