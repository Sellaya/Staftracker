"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  CalendarDays,
  Clock,
  DollarSign,
  ChevronRight,
  Briefcase,
  AlertCircle,
  X,
  Navigation,
  Shirt,
  Car,
  Loader2,
} from "lucide-react";
import Link from "next/link";

type MyAppStatus = "none" | "pending_admin" | "withdrawn" | "rejected";

type OpenShift = {
  id: string;
  role: string;
  venue: string;
  address: string;
  date: string;
  time: string;
  hours: number;
  rate: number;
  urgent: boolean;
  myAppStatus: MyAppStatus;
  rejectionReason?: string;
  instructions: string;
  uniform: string;
  parking: string;
};

export default function WorkerOpenShifts() {
  const [shifts, setShifts] = useState<OpenShift[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [workerName, setWorkerName] = useState<string>("");
  const [profileIncompleteReason, setProfileIncompleteReason] = useState<string | null>(null);
  const [marketplaceGateMessage, setMarketplaceGateMessage] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [previewShift, setPreviewShift] = useState<OpenShift | null>(null);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [withdrawBusyId, setWithdrawBusyId] = useState<string | null>(null);

  const formatTime = useCallback((timeStr: string) => {
    if (!timeStr) return "--:--";
    const [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  }, []);

  const mapJobToShift = useCallback((dbJob: any, currentWorkerId: string): OpenShift => {
    const row = dbJob.applicants?.find((a: any) => a.id === currentWorkerId);
    let myAppStatus: MyAppStatus = "none";
    if (row) {
      const v = String(row.status || "pending_admin");
      if (v === "pending_admin") myAppStatus = "pending_admin";
      else if (v === "withdrawn") myAppStatus = "withdrawn";
      else if (v === "rejected") myAppStatus = "rejected";
      else myAppStatus = "pending_admin";
    }
    return {
      id: dbJob.id,
      role: dbJob.role,
      venue: dbJob.venueName,
      address: dbJob.parking || "Parking / address details on file",
      date: dbJob.date,
      time: `${formatTime(dbJob.startTime)} - ${formatTime(dbJob.endTime)}`,
      hours: dbJob.hours,
      rate: dbJob.hourlyRate,
      urgent: dbJob.isUrgent,
      myAppStatus,
      rejectionReason: row?.rejectionReason ? String(row.rejectionReason) : undefined,
      instructions: dbJob.instructions || "",
      uniform: dbJob.uniform || "",
      parking: dbJob.parking || "",
    };
  }, [formatTime]);

  const fetchLiveJobs = useCallback(async (currentWorkerId: string) => {
    try {
      const res = await fetch("/api/jobs", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const liveShifts: OpenShift[] = data
          .filter((dbJob: any) => dbJob.status === "Open")
          .map((dbJob: any) => mapJobToShift(dbJob, currentWorkerId));
        setShifts(liveShifts);
      }
    } catch {
      console.error("Failed to fetch live jobs");
    } finally {
      setLoading(false);
    }
  }, [mapJobToShift]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const meRes = await fetch("/api/me", { cache: "no-store" });
        if (!meRes.ok) {
          setApplyError("Please login as worker to view jobs.");
          setLoading(false);
          return;
        }
        const me = await meRes.json();
        if (me.role !== "worker") {
          setApplyError("Worker account required.");
          setLoading(false);
          return;
        }
        setWorkerId(me.id);
        setWorkerName(me.name || `${me.firstName || ""} ${me.lastName || ""}`.trim());

        const profileRes = await fetch("/api/worker/profile", { cache: "no-store" });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          const cleared = profile.status === "Active" && profile.documentStatus === "Approved";
          if (!cleared) {
            setMarketplaceGateMessage(
              "Your profile is under admin review. Once your documents are approved and your account is marked active, open shifts will appear here (MVP Week 1 gate)."
            );
          } else {
            setMarketplaceGateMessage(null);
          }
          const docs = Array.isArray(profile?.documents) ? profile.documents : [];
          const hasGovId = docs.some((d: any) => d.type === "Government ID");
          const hasProfilePhoto = docs.some((d: any) => d.type === "Profile Photo");
          const hasRole = Array.isArray(profile?.roles) && profile.roles.length > 0;
          if (!hasRole || !hasGovId || !hasProfilePhoto) {
            setProfileIncompleteReason(
              "Complete profile roles and upload Government ID + Profile Photo to apply faster."
            );
          }
        }

        await fetchLiveJobs(me.id);
      } catch {
        setApplyError("Unable to load jobs right now.");
        setLoading(false);
      }
    };

    bootstrap();
  }, [fetchLiveJobs]);

  const submitApplication = async (jobId: string) => {
    if (!workerId) return;
    setApplyError(null);
    setApplySuccess(null);
    setApplySubmitting(true);
    try {
      const res = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, workerId, workerName }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShifts((prev) =>
          prev.map((s) =>
            s.id === jobId
              ? { ...s, myAppStatus: "pending_admin" as const, rejectionReason: undefined }
              : s
          )
        );
        setApplySuccess(
          data.message === "Already applied"
            ? "You are already waiting for admin review on this shift."
            : "Application submitted. Review arrival details in My Shifts once an admin confirms you."
        );
        setPreviewShift(null);
        return;
      }
      setApplyError(data.error || "Failed to apply.");
    } catch {
      setApplyError("Failed to apply. Please try again.");
    } finally {
      setApplySubmitting(false);
    }
  };

  const handleWithdraw = async (jobId: string) => {
    setApplyError(null);
    setApplySuccess(null);
    setWithdrawBusyId(jobId);
    try {
      const res = await fetch("/api/jobs/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setApplyError(data.error || "Could not withdraw application.");
        return;
      }
      setShifts((prev) =>
        prev.map((s) =>
          s.id === jobId ? { ...s, myAppStatus: "withdrawn" as const, rejectionReason: undefined } : s
        )
      );
      setApplySuccess("You withdrew your application. You can apply again if the shift is still open.");
    } catch {
      setApplyError("Withdraw failed. Try again.");
    } finally {
      setWithdrawBusyId(null);
    }
  };

  const filteredShifts = shifts.filter((s) => {
    const matchesSearch =
      s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.venue.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filter === "Urgent") return s.urgent;
    if (filter === "Applied") return s.myAppStatus === "pending_admin";
    return true;
  });

  const inReview = (s: OpenShift) => s.myAppStatus === "pending_admin";

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Open Shifts Hub</h1>
          <p className="text-foreground/70 mt-1">Browse open posts, review site details, then apply. Admin confirms the official assignment.</p>
        </div>
      </div>
      {marketplaceGateMessage && (
        <div className="p-4 border border-secondary bg-secondary/20 rounded-xl flex items-start gap-2 text-sm text-foreground/80">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
          <span>{marketplaceGateMessage}</span>
        </div>
      )}
      {profileIncompleteReason && (
        <div className="p-4 border border-amber-500/30 bg-amber-500/10 rounded-xl flex items-start justify-between gap-4">
          <div className="text-sm text-amber-600 font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{profileIncompleteReason}</span>
          </div>
          <Link
            href="/worker/profile"
            className="text-xs font-medium text-amber-700 underline whitespace-nowrap"
          >
            Complete Profile
          </Link>
        </div>
      )}
      {applySuccess && (
        <div className="p-3 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 rounded-xl text-sm font-medium">
          {applySuccess}
        </div>
      )}
      {applyError && (
        <div className="p-3 border border-red-500/30 bg-red-500/10 text-red-600 rounded-xl text-sm font-medium">
          {applyError}
        </div>
      )}

      <div className="glass rounded-2xl bg-background/50 border border-secondary flex flex-col overflow-hidden p-4 gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roles or venues..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-secondary rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto hide-scrollbar">
          {["All", "Urgent", "Applied"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "border border-secondary hover:bg-secondary/50"
              }`}
            >
              {f === "Applied" ? "In review" : f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence>
          {!loading &&
            filteredShifts.map((shift) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={shift.id}
                className={`p-6 rounded-2xl border bg-background/80 glass flex flex-col justify-between ${
                  inReview(shift)
                    ? "border-amber-500/30 shadow-lg shadow-amber-500/10"
                    : shift.myAppStatus === "rejected"
                      ? "border-red-500/20"
                      : shift.urgent
                        ? "border-amber-500/30 shadow-lg shadow-amber-500/10"
                        : "border-secondary"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-lg ${
                          inReview(shift) ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"
                        }`}
                      >
                        <Briefcase className="w-5 h-5" />
                      </div>
                      {shift.urgent && !inReview(shift) && (
                        <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-medium uppercase tracking-wider rounded border border-amber-500/20">
                          Urgent
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-medium text-emerald-500">
                        ${shift.rate}
                        <span className="text-sm font-medium text-foreground/50">/hr</span>
                      </p>
                      <p className="text-xs font-medium text-foreground/50">
                        Est. ${(shift.rate * shift.hours).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <h3 className="text-xl font-medium mb-1">{shift.role}</h3>
                  <p className="text-sm text-foreground/70 font-medium mb-4">{shift.venue}</p>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-foreground/70">
                      <CalendarDays className="w-4 h-4" /> {shift.date}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground/70">
                      <Clock className="w-4 h-4" /> {shift.time} ({shift.hours} hrs)
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground/70">
                      <MapPin className="w-4 h-4" /> {shift.address}
                    </div>
                  </div>
                </div>

                {shift.myAppStatus === "pending_admin" && (
                  <div className="space-y-2">
                    <div className="w-full py-3 bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/25 rounded-xl font-medium flex items-center justify-center gap-2 text-sm text-center px-2">
                      <Clock className="w-4 h-4 shrink-0" /> Awaiting admin confirmation
                    </div>
                    <button
                      type="button"
                      disabled={withdrawBusyId === shift.id}
                      onClick={() => handleWithdraw(shift.id)}
                      className="w-full py-2.5 border border-secondary text-sm font-medium rounded-xl hover:bg-secondary/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {withdrawBusyId === shift.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : null}
                      Withdraw application
                    </button>
                  </div>
                )}

                {shift.myAppStatus === "rejected" && (
                  <div className="space-y-2">
                    <div className="w-full py-3 bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20 rounded-xl text-sm font-medium text-center px-2">
                      Not selected for this shift.
                      {shift.rejectionReason ? (
                        <span className="block text-xs font-normal mt-1 opacity-90">{shift.rejectionReason}</span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewShift(shift)}
                      className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                    >
                      Review &amp; apply again <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {shift.myAppStatus === "withdrawn" && (
                  <div className="space-y-2">
                    <div className="w-full py-3 bg-secondary/30 border border-secondary rounded-xl text-sm font-medium text-center text-foreground/70">
                      You withdrew your application.
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewShift(shift)}
                      className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                    >
                      Review &amp; apply again <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {shift.myAppStatus === "none" && (
                  <button
                    type="button"
                    onClick={() => setPreviewShift(shift)}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    Review details &amp; apply <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ))}
        </AnimatePresence>
        {loading && (
          <div className="col-span-full py-12 text-center text-foreground/50 border border-dashed border-secondary rounded-2xl bg-secondary/5">
            Loading open shifts...
          </div>
        )}

        {!loading && filteredShifts.length === 0 && (
          <div className="col-span-full py-12 text-center text-foreground/50 border border-dashed border-secondary rounded-2xl bg-secondary/5">
            {marketplaceGateMessage
              ? "No open shifts are available until your account is active and documents approved."
              : "No open shifts match your search."}
          </div>
        )}
      </div>

      <AnimatePresence>
        {previewShift && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
              onClick={() => !applySubmitting && setPreviewShift(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              className="fixed left-1/2 top-1/2 z-[70] w-[min(100%,28rem)] -translate-x-1/2 -translate-y-1/2 max-h-[min(90vh,640px)] overflow-y-auto rounded-2xl border border-secondary bg-background p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-primary">Before you apply</p>
                  <h2 className="text-xl font-medium mt-1">{previewShift.role}</h2>
                  <p className="text-sm text-foreground/60 mt-0.5">{previewShift.venue}</p>
                </div>
                <button
                  type="button"
                  disabled={applySubmitting}
                  onClick={() => setPreviewShift(null)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm mb-6">
                <div className="flex items-center gap-2 text-foreground/70">
                  <CalendarDays className="w-4 h-4 shrink-0" />
                  {previewShift.date} · {previewShift.time}
                </div>
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <DollarSign className="w-4 h-4" /> ${previewShift.rate}/hr · {previewShift.hours} hrs
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="p-3 rounded-xl border border-secondary bg-secondary/5 flex gap-3">
                  <Navigation className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-medium text-foreground/50 uppercase">Arrival instructions</p>
                    <p className="text-sm mt-1">{previewShift.instructions || "Client did not add extra instructions."}</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-secondary bg-secondary/5 flex gap-3">
                  <Shirt className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-medium text-foreground/50 uppercase">Uniform</p>
                    <p className="text-sm mt-1">{previewShift.uniform || "Standard venue dress code."}</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-secondary bg-secondary/5 flex gap-3">
                  <Car className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-medium text-foreground/50 uppercase">Parking</p>
                    <p className="text-sm mt-1">{previewShift.parking || "Not specified — confirm with site lead if needed."}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-foreground/50 mb-4">
                Applying sends your profile to the client&apos;s admin queue. You are not officially booked until an admin confirms you
                (Week 2 flow).
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={applySubmitting}
                  onClick={() => setPreviewShift(null)}
                  className="flex-1 py-3 border border-secondary rounded-xl font-medium text-sm hover:bg-secondary/30 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={applySubmitting}
                  onClick={() => submitApplication(previewShift.id)}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {applySubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Submit application
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
