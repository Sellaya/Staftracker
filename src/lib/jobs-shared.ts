/** Week 2 marketplace: applicant lifecycle (pending admin → confirmed / rejected). */

/** When admin confirms one worker, other pending rows get this reason (used to reopen on unassign). */
export const APPLICANT_AUTO_REJECT_REASON = "Another worker was confirmed for this shift";

export type ApplicantStatus = "pending_admin" | "confirmed" | "rejected" | "withdrawn";

export type JobApplicant = {
  id: string;
  name: string;
  reliability: number;
  appliedAt: string;
  status?: ApplicantStatus;
  rejectionReason?: string;
};

export function normalizeApplicant(raw: Record<string, unknown>): JobApplicant {
  const st = String(raw.status || "pending_admin") as ApplicantStatus;
  const status: ApplicantStatus = ["pending_admin", "confirmed", "rejected", "withdrawn"].includes(st)
    ? st
    : "pending_admin";
  return {
    id: String(raw.id || ""),
    name: String(raw.name || ""),
    reliability: Number.isFinite(Number(raw.reliability)) ? Number(raw.reliability) : 100,
    appliedAt: String(raw.appliedAt || raw.applied_at || new Date().toISOString()),
    status,
    rejectionReason: raw.rejectionReason ? String(raw.rejectionReason) : undefined,
  };
}

export function normalizeApplicants(list: unknown): JobApplicant[] {
  if (!Array.isArray(list)) return [];
  return list.map((a) => normalizeApplicant(a as Record<string, unknown>));
}

/** JSONB / string / array applicants column from Postgres or JSON files. */
export function applicantsFromDbColumn(raw: unknown): JobApplicant[] {
  if (typeof raw === "string") {
    try {
      return normalizeApplicants(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return normalizeApplicants(raw);
}

/** Collect role strings from JSON workers (roles array, single role, or admin overrides). */
export function workerRoleStrings(worker: Record<string, unknown>): string[] {
  if (Array.isArray(worker.roles)) {
    return (worker.roles as unknown[]).map((r) => String(r).trim()).filter(Boolean);
  }
  if (typeof worker.role === "string" && worker.role.trim()) {
    return [worker.role.trim()];
  }
  if (Array.isArray(worker.roleOverrides)) {
    return (worker.roleOverrides as Record<string, unknown>[])
      .map((o) => String(o?.name ?? o?.role ?? "").trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * After admin unassigns, reopen the job queue: drop auto-rejections from the last fill,
 * and mark the former assignee as released (they can apply again via apply flow).
 */
export function applicantsAfterUnassign(apps: JobApplicant[], formerAssigneeId: string): JobApplicant[] {
  const wid = String(formerAssigneeId || "");
  return apps.map((a) => {
    if (wid && a.id === wid && a.status === "confirmed") {
      return {
        ...a,
        status: "rejected" as const,
        rejectionReason: "Assignment was released by admin.",
      };
    }
    if (a.status === "rejected" && a.rejectionReason === APPLICANT_AUTO_REJECT_REASON) {
      return {
        ...a,
        status: "pending_admin" as const,
        rejectionReason: undefined,
      };
    }
    return a;
  });
}

/** Simple manual matching score for admin (role overlap, cleared worker + reliability). */
export function scoreWorkerForJob(worker: Record<string, unknown>, jobRole: string): number {
  const roles = workerRoleStrings(worker);
  const jr = (jobRole || "").toLowerCase().trim();
  let score = 0;
  const doc =
    String(worker.documentStatus ?? worker.document_status ?? "") === "Approved"
      ? "Approved"
      : String(worker.documentStatus ?? worker.document_status ?? "");
  const status = String(worker.status ?? "");
  if (doc === "Approved" && status === "Active") score += 40;
  else if (doc === "Approved") score += 25;
  if (roles.some((r) => jr.includes(r.toLowerCase()) || r.toLowerCase().includes(jr))) score += 35;
  const rel = Number(worker.reliability);
  if (Number.isFinite(rel)) score += Math.min(25, Math.round(rel / 4));
  return score;
}
