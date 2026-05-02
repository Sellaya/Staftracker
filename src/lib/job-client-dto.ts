import { normalizeApplicants } from "@/lib/jobs-shared";

/** Normalize a job row from DB (snake or camel) for dashboard / worker clients. */
export function jobRowToClientJob(row: Record<string, unknown>) {
  const applicants = normalizeApplicants(row.applicants);
  return {
    id: row.id,
    clientId: row.client_id ?? row.clientId ?? null,
    clientName: row.client_name ?? row.clientName ?? null,
    venueId: row.venue_id ?? row.venueId ?? null,
    venueName: row.venue_name ?? row.venueName ?? "",
    role: row.role,
    date: row.date,
    startTime: row.start_time ?? row.startTime ?? "",
    endTime: row.end_time ?? row.endTime ?? "",
    hours: Number(row.hours ?? 0),
    hourlyRate: Number(row.hourly_rate ?? row.hourlyRate ?? row.rate ?? 0),
    status: row.status,
    isUrgent: Boolean(row.is_urgent ?? row.isUrgent),
    instructions: String(row.instructions ?? ""),
    uniform: String(row.uniform ?? ""),
    parking: String(row.parking ?? ""),
    applicants,
    assignedWorkerId: (row.assigned_worker_id ?? row.assignedWorkerId ?? null) as string | null,
    assignedWorkerName: (row.assigned_worker_name ?? row.assignedWorkerName ?? null) as string | null,
    headcount: Number.isFinite(Number(row.headcount)) ? Number(row.headcount) : 1,
  };
}
