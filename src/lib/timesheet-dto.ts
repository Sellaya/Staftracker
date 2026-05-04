/** Map `timesheets` table row → camelCase for dashboards / billing views. */
export function timesheetRowToClient(row: Record<string, unknown>) {
  return {
    id: row.id,
    shiftId: row.shift_id ?? row.shiftId ?? null,
    workerId: row.worker_id ?? row.workerId ?? null,
    workerName: row.worker_name ?? row.workerName ?? "",
    clientId: row.client_id ?? row.clientId ?? null,
    clientName: row.client_name ?? row.clientName ?? "",
    venueName: row.venue_name ?? row.venueName ?? "",
    role: row.role ?? "",
    date: row.date ?? "",
    scheduledStart: row.scheduled_start ?? row.scheduledStart ?? "",
    scheduledEnd: row.scheduled_end ?? row.scheduledEnd ?? "",
    actualCheckIn: row.actual_check_in ?? row.actualCheckIn ?? null,
    actualCheckOut: row.actual_check_out ?? row.actualCheckOut ?? null,
    hours: Number(row.hours ?? 0),
    rate: Number(row.rate ?? 0),
    status: row.status ?? "draft",
    rejectionReason: row.rejection_reason ?? row.rejectionReason ?? null,
    issueReason: row.issue_reason ?? row.issueReason ?? null,
    approvedAt: row.approved_at ?? row.approvedAt ?? null,
    approvedBy: row.approved_by ?? row.approvedBy ?? null,
    createdAt: row.created_at ?? row.createdAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
  };
}
