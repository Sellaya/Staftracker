"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, FileText, Plus, ReceiptText } from "lucide-react";
import { EmptyState, FilterBar, LoadingState, MetricCard, Notice, PageHeader, SearchInput, WorkspaceCard } from "@/components/ui/workspace";
import { StatusBadge } from "@/components/ui/status-badge";

type Invoice = {
  id: string;
  clientId?: string;
  clientName?: string;
  amount: number;
  status: string;
  createdAt?: string;
  dueDate?: string;
  shiftCount?: number;
  shiftIds?: string[];
};

type Client = {
  id: string;
  name: string;
};

type Shift = {
  id: string;
  clientId?: string;
  clientName?: string;
  venueName?: string;
  role?: string;
  date?: string;
  hours?: number;
  rate?: number;
  isApproved?: boolean;
  isInvoiced?: boolean;
};

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [notice, setNotice] = useState<{ type: "green" | "red" | "amber"; text: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchData = async () => {
    const asArray = async (res: Response) => {
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    };
    const [meRes, invoicesRes, clientsRes, shiftsRes] = await Promise.all([
      fetch("/api/me", { cache: "no-store" }),
      fetch("/api/invoices", { cache: "no-store" }),
      fetch("/api/clients", { cache: "no-store" }),
      fetch("/api/shifts", { cache: "no-store" }),
    ]);
    setCurrentUser(meRes.ok ? await meRes.json() : null);
    const [invoiceRows, clientRows, shiftRows] = await Promise.all([
      asArray(invoicesRes),
      asArray(clientsRes),
      asArray(shiftsRes),
    ]);
    setInvoices(invoiceRows);
    setClients(clientRows);
    setShifts(shiftRows);
    if (!selectedClientId && clientRows[0]?.id) setSelectedClientId(clientRows[0].id);
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isClientUser = currentUser?.role === "user";
  const approvedUnbilled = useMemo(
    () => shifts.filter((s) => s.isApproved === true && s.isInvoiced !== true),
    [shifts],
  );
  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const selectedClientUnbilled = approvedUnbilled.filter((shift) => !selectedClientId || shift.clientId === selectedClientId);
  const pendingAmount = selectedClientUnbilled.reduce((sum, shift) => sum + Number(shift.hours || 0) * Number(shift.rate || 25), 0);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const status = String(invoice.status || "Pending");
      const matchesSearch =
        invoice.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(invoice.clientName || "").toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (filter === "All") return true;
      return status.toLowerCase() === filter.toLowerCase();
    });
  }, [filter, invoices, searchQuery]);

  const handleGenerateInvoice = async () => {
    if (!selectedClientId || !selectedClient) {
      setNotice({ type: "amber", text: "Select a client before generating an invoice." });
      return;
    }
    setIsGenerating(true);
    setNotice(null);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClientId, clientName: selectedClient.name, shiftIds: [] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ type: "red", text: data.error || "Failed to generate invoice." });
        return;
      }
      setNotice({ type: "green", text: `Invoice ${data.id} generated from approved, unbilled shifts.` });
      await fetchData();
    } catch {
      setNotice({ type: "red", text: "Failed to generate invoice." });
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) return <LoadingState label="Loading invoices" />;

  return (
    <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
      <PageHeader
        eyebrow={isClientUser ? "Client billing" : "Billing operations"}
        title="Invoices"
        description={
          isClientUser
            ? "View your account invoices and generate invoices from your approved, unbilled shifts."
            : "Generate and review invoices from approved, unbilled shifts across client accounts."
        }
        actions={
          <button
            type="button"
            onClick={handleGenerateInvoice}
            disabled={isGenerating || selectedClientUnbilled.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {isGenerating ? "Generating" : "Generate invoice"}
          </button>
        }
      />

      {notice && <Notice tone={notice.type}>{notice.text}</Notice>}

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Invoices" value={invoices.length} helper="Visible to your role" icon={ReceiptText} />
        <MetricCard label="Approved unbilled" value={approvedUnbilled.length} helper="Ready for invoice generation" icon={CalendarDays} tone="green" />
        <MetricCard label="Selected client total" value={money(pendingAmount)} helper={`${selectedClientUnbilled.length} shifts ready`} icon={FileText} tone="amber" />
      </div>

      <WorkspaceCard padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border bg-muted/45 p-3 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search invoice or client..." className="lg:max-w-sm" />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedClientId}
              onChange={(event) => setSelectedClientId(event.target.value)}
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm font-medium"
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <FilterBar filters={["All", "Pending", "Paid", "Failed"]} active={filter} onChange={setFilter} />
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={ReceiptText}
              title="No invoices found"
              description="Invoices appear after approved, unbilled shifts are grouped for a client."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Shifts</th>
                  <th className="px-4 py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{invoice.id}</p>
                      <p className="text-xs font-medium text-muted-foreground">Generated invoice</p>
                    </td>
                    <td className="px-4 py-3 font-medium">{invoice.clientName || "—"}</td>
                    <td className="px-4 py-3 font-medium">{money(invoice.amount)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">Created {shortDate(invoice.createdAt)}</p>
                      <p className="text-xs font-medium text-muted-foreground">Due {shortDate(invoice.dueDate)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{invoice.shiftCount || invoice.shiftIds?.length || 0} shifts</p>
                      <p className="max-w-[220px] truncate text-xs font-medium text-muted-foreground">
                        {(invoice.shiftIds || []).join(", ") || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StatusBadge status={invoice.status || "Pending"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </WorkspaceCard>
    </div>
  );
}

