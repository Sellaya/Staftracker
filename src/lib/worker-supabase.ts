/**
 * Week 1: map `workers` table rows (snake_case / Supabase) ↔ app worker objects (camelCase / workers.json).
 * Align DB columns with inserts in signup/worker and PATCH payloads from admin UI.
 */

export function workerDbRowToApp(row: Record<string, unknown>): Record<string, unknown> {
  const neighborhoods = row.neighborhoods ?? row.neighborhood_ids;
  return {
    id: row.id,
    name: row.name ?? "",
    firstName: row.first_name ?? row.firstName ?? "",
    lastName: row.last_name ?? row.lastName ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    address: row.address ?? "",
    status: row.status ?? "Pending",
    documentStatus: row.document_status ?? row.documentStatus ?? "Pending",
    reliability: Number.isFinite(Number(row.reliability)) ? Number(row.reliability) : 100,
    roles: Array.isArray(row.roles) ? row.roles : [],
    roleOverrides: row.role_overrides ?? row.roleOverrides ?? [],
    flags: Array.isArray(row.flags) ? row.flags : [],
    notes: Array.isArray(row.notes) ? row.notes : [],
    shiftHistory: Array.isArray(row.shift_history) ? row.shift_history : Array.isArray(row.shiftHistory) ? row.shiftHistory : [],
    lifetimeEarnings: row.lifetime_earnings ?? row.lifetimeEarnings ?? "$0.00",
    legalStatus: row.legal_status ?? row.legalStatus ?? "",
    linkedin: row.linkedin ?? "",
    postalCode: row.postal_code ?? row.postalCode ?? "",
    neighborhoods: Array.isArray(neighborhoods) ? neighborhoods : [],
    yearsExperience: row.years_experience ?? row.yearsExperience ?? "",
    bio: row.bio ?? "",
    smartServeHas: Boolean(row.smart_serve_has ?? row.smartServeHas),
    smartServeNumber: row.smart_serve_number ?? row.smartServeNumber ?? "",
    foodHandlerHas: Boolean(row.food_handler_has ?? row.foodHandlerHas),
    foodHandlerNumber: row.food_handler_number ?? row.foodHandlerNumber ?? "",
    resumeFileName: row.resume_file_name ?? row.resumeFileName ?? null,
    extraDocFileName: row.extra_doc_file_name ?? row.extraDocFileName ?? null,
    documents: Array.isArray(row.documents) ? row.documents : [],
    createdAt: row.created_at ?? row.createdAt ?? null,
  };
}

/** Build insert payload for `workers` from worker signup (camelCase source fields). */
export function workerSignupToDbRow(params: {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  legalStatus: string;
  linkedin: string;
  postalCode: string;
  neighborhoods: string[];
  primaryRoles: string[];
  yearsExperience: string;
  bio: string;
  smartServeHas: boolean;
  smartServeNumber: string;
  foodHandlerHas: boolean;
  foodHandlerNumber: string;
  resumeFileName: string | null;
  extraDocFileName: string | null;
  documents: unknown[];
  now: string;
}): Record<string, unknown> {
  const {
    id,
    fullName,
    firstName,
    lastName,
    email,
    phone,
    legalStatus,
    linkedin,
    postalCode,
    neighborhoods,
    primaryRoles,
    yearsExperience,
    bio,
    smartServeHas,
    smartServeNumber,
    foodHandlerHas,
    foodHandlerNumber,
    resumeFileName,
    extraDocFileName,
    documents,
    now,
  } = params;

  return {
    id,
    name: fullName,
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    address: "",
    status: "Pending",
    document_status: "Pending",
    reliability: 100,
    roles: primaryRoles,
    role_overrides: [],
    flags: [],
    notes: [],
    shift_history: [],
    lifetime_earnings: "$0.00",
    legal_status: legalStatus,
    linkedin,
    postal_code: postalCode,
    neighborhoods,
    years_experience: yearsExperience,
    bio,
    smart_serve_has: smartServeHas,
    smart_serve_number: smartServeNumber,
    food_handler_has: foodHandlerHas,
    food_handler_number: foodHandlerNumber,
    resume_file_name: resumeFileName,
    extra_doc_file_name: extraDocFileName,
    documents,
    created_at: now,
  };
}

/** MVP: aggregate document queue status from per-document statuses (matches workers.json logic). */
export function computeAggregateDocumentStatus(documents: unknown[]): "Pending" | "Approved" {
  if (!Array.isArray(documents) || documents.length === 0) return "Pending";
  for (const d of documents) {
    const s = String((d as Record<string, unknown>)?.status || "Pending");
    if (s === "Pending" || s === "Rejected") return "Pending";
  }
  return "Approved";
}

/** Full app worker object (camelCase, file/JSON shape) → DB row for Supabase insert/update. */
export function workerFileShapeToDb(w: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: w.id,
    name: w.name ?? "",
    first_name: w.firstName ?? "",
    last_name: w.lastName ?? "",
    email: w.email ?? "",
    phone: w.phone ?? "",
    address: w.address ?? "",
    status: w.status ?? "Pending",
    document_status: w.documentStatus ?? "Pending",
    reliability: Number.isFinite(Number(w.reliability)) ? Number(w.reliability) : 100,
    roles: Array.isArray(w.roles) ? w.roles : [],
    role_overrides: w.roleOverrides ?? w.role_overrides ?? [],
    flags: Array.isArray(w.flags) ? w.flags : [],
    notes: Array.isArray(w.notes) ? w.notes : [],
    shift_history: w.shiftHistory ?? w.shift_history ?? [],
    lifetime_earnings: w.lifetimeEarnings ?? w.lifetime_earnings ?? "$0.00",
    legal_status: w.legalStatus ?? w.legal_status ?? "",
    linkedin: w.linkedin ?? "",
    postal_code: w.postalCode ?? w.postal_code ?? "",
    neighborhoods: Array.isArray(w.neighborhoods) ? w.neighborhoods : [],
    years_experience: w.yearsExperience ?? w.years_experience ?? "",
    bio: w.bio ?? "",
    smart_serve_has: Boolean(w.smartServeHas ?? w.smart_serve_has),
    smart_serve_number: w.smartServeNumber ?? w.smart_serve_number ?? "",
    food_handler_has: Boolean(w.foodHandlerHas ?? w.food_handler_has),
    food_handler_number: w.foodHandlerNumber ?? w.food_handler_number ?? "",
    resume_file_name: w.resumeFileName ?? w.resume_file_name ?? null,
    extra_doc_file_name: w.extraDocFileName ?? w.extra_doc_file_name ?? null,
    documents: Array.isArray(w.documents) ? w.documents : [],
  };
  if (w.createdAt ?? w.created_at) {
    out.created_at = w.createdAt ?? w.created_at;
  }
  return out;
}

/** Convert partial app-level worker PATCH to snake_case DB patch (only defined keys). */
export function appWorkerPatchToDb(patch: Record<string, unknown>): Record<string, unknown> {
  const keyMap: Record<string, string> = {
    firstName: "first_name",
    lastName: "last_name",
    documentStatus: "document_status",
    roleOverrides: "role_overrides",
    shiftHistory: "shift_history",
    lifetimeEarnings: "lifetime_earnings",
    legalStatus: "legal_status",
    postalCode: "postal_code",
    yearsExperience: "years_experience",
    smartServeHas: "smart_serve_has",
    smartServeNumber: "smart_serve_number",
    foodHandlerHas: "food_handler_has",
    foodHandlerNumber: "food_handler_number",
    resumeFileName: "resume_file_name",
    extraDocFileName: "extra_doc_file_name",
  };

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const dbKey = keyMap[k] ?? k;
    out[dbKey] = v;
  }
  return out;
}
