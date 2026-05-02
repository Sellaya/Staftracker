/** Map `shifts` table row (snake_case) → client shape used across dashboard / worker UIs. */
export function shiftRowToClient(row: Record<string, unknown>) {
  return {
    ...row,
    jobId: row.job_id ?? row.jobId ?? null,
    clientId: row.client_id ?? row.clientId ?? null,
    clientName: row.client_name ?? row.clientName ?? null,
    venueId: row.venue_id ?? row.venueId ?? null,
    venueName: row.venue_name ?? row.venueName ?? "",
    scheduledStart: row.scheduled_start ?? row.scheduledStart ?? null,
    scheduledEnd: row.scheduled_end ?? row.scheduledEnd ?? null,
    workerId: row.worker_id ?? row.workerId ?? null,
    workerName: row.worker_name ?? row.workerName ?? null,
    actualCheckIn: row.actual_check_in ?? row.actualCheckIn ?? null,
    actualCheckOut: row.actual_check_out ?? row.actualCheckOut ?? null,
    gpsStatus: row.gps_status ?? row.gpsStatus ?? null,
    isFlagged: row.is_flagged ?? row.isFlagged ?? false,
    flagReason: row.flag_reason ?? row.flagReason ?? null,
    timesheetId: row.timesheet_id ?? row.timesheetId ?? null,
    paymentStatus: row.payment_status ?? row.paymentStatus ?? "pending",
    invoiceStatus: row.invoice_status ?? row.invoiceStatus ?? "pending",
    isApproved: row.is_approved ?? row.isApproved ?? false,
    isInvoiced: row.is_invoiced ?? row.isInvoiced ?? false,
    invoiceId: row.invoice_id ?? row.invoiceId ?? null,
    createdAt: row.created_at ?? row.createdAt ?? null,
  };
}
