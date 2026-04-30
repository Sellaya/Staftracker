"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, Search, Filter, MoreVertical, MapPin, DollarSign, Settings,
  X, UserCircle, Star, History, FileText, ShieldAlert, Edit3, Trash2, Check,
  CreditCard, Users, Briefcase, RefreshCcw, Heart, ChevronRight, Plus
} from "lucide-react";

// Types
type Invoice = { id: string, amount: number, status: "Paid" | "Pending" | "Failed", createdAt: string };
type Rate = { role: string, rate: number };

type Client = {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  status: "Active" | "Suspended" | "Pending Payment";
  paymentMethod: string;
  address?: string;
  industry?: string;
  taxId?: string;
  notes?: string;
  customRates: Rate[];
  preferredWorkers: { id: string, name: string }[];
  invoices: Invoice[];
  venueCount: number;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [workerSearch, setWorkerSearch] = useState("");
  
  const [editClientData, setEditClientData] = useState<Client | null>(null);
  const [newClientData, setNewClientData] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    paymentMethod: "Credit Card",
    address: "",
    industry: "Hospitality",
    taxId: "",
    notes: ""
  });

  const getAuthHeaders = () => {
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    return {
      'x-user-email': user.email || 'admin@example.com',
      'x-user-id': user.id || 'U-001'
    };
  };

  const fetchData = async () => {
    const [cRes, wRes] = await Promise.all([
      fetch('/api/clients'),
      fetch('/api/workers')
    ]);
    const cData = await cRes.json();
    const wData = await wRes.json();
    if(Array.isArray(cData)) setClients(cData);
    if(Array.isArray(wData)) setWorkers(wData);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("All"); 
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview"); 

  const fetchInvoices = async (clientId: string) => {
    const res = await fetch(`/api/invoices?clientId=${clientId}`);
    const data = await res.json();
    setInvoices(data);
  };

  useEffect(() => {
    if (selectedClientId) {
      fetchInvoices(selectedClientId);
    }
  }, [selectedClientId]);

  const handleGenerateInvoice = async () => {
    if (!selectedClientId) return;
    setIsGenerating(true);
    try {
      const selectedClient = clients.find(c => c.id === selectedClientId);
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          clientId: selectedClientId,
          clientName: selectedClient?.name,
          shiftIds: [] 
        })
      });
      if (res.ok) {
        fetchInvoices(selectedClientId);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to generate invoice");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.contactName.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filter === "All") return true;
      if (filter === "Active") return c.status === "Active";
      if (filter === "Suspended") return c.status === "Suspended";
      if (filter === "Pending Payment") return c.status === "Pending Payment";
      
      return true;
    });
  }, [clients, searchQuery, filter]);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleUpdateClient = async (updatedData: any) => {
    try {
      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        setClients(clients.map(c => c.id === updatedData.id ? updatedData : c));
        setIsEditModalOpen(false);
      }
    } catch (e) { console.error(e); }
  };

  const toggleSuspend = (id: string) => {
    const client = clients.find(c => c.id === id);
    if (client) {
      handleUpdateClient({ ...client, status: client.status === "Active" ? "Suspended" : "Active" });
    }
  };

  const addToPreferred = (worker: any) => {
    if (!selectedClient) return;
    if (selectedClient.preferredWorkers.some(w => w.id === worker.id)) return;
    const updated = {
      ...selectedClient,
      preferredWorkers: [...selectedClient.preferredWorkers, { id: worker.id, name: worker.name }]
    };
    handleUpdateClient(updated);
  };

  const removeFromPreferred = (workerId: string) => {
    if (!selectedClient) return;
    const updated = {
      ...selectedClient,
      preferredWorkers: selectedClient.preferredWorkers.filter(w => w.id !== workerId)
    };
    handleUpdateClient(updated);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(newClientData)
      });
      const addedClient = await res.json();
      setClients([...clients, addedClient]);
      setIsAddModalOpen(false);
      setNewClientData({ name: "", contactName: "", email: "", phone: "", paymentMethod: "Credit Card", address: "", industry: "Hospitality", taxId: "", notes: "" });
    } catch (error) {
      console.error(error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteClient = (id: string) => {
    setClientToDelete(id);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/clients?id=${clientToDelete}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setClients(clients.filter(c => c.id !== clientToDelete));
        setSelectedClientId(null);
        setClientToDelete(null);
      }
    } catch (error) {
      console.error("Failed to delete client", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Management</h1>
          <p className="text-foreground/70 mt-1">Manage hospitality venues, custom rates, and billing profiles.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
        >
          + Add New Client
        </button>
      </div>

      <div className="glass rounded-2xl bg-background/50 border border-secondary overflow-hidden">
        <div className="p-4 border-b border-secondary/50 flex flex-col md:flex-row gap-4 justify-between items-center bg-secondary/10">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients..." 
              className="w-full pl-10 pr-4 py-2 bg-background border border-secondary rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {["All", "Active", "Pending Payment", "Suspended"].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === f ? "bg-primary text-primary-foreground" : "border border-secondary hover:bg-secondary/50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/30 text-foreground/70 border-b border-secondary/50">
              <tr>
                <th className="px-6 py-4 font-medium">Company Profile</th>
                <th className="px-6 py-4 font-medium">Venues</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  key={client.id} 
                  onClick={() => setSelectedClientId(client.id)}
                  className="border-b border-secondary/20 hover:bg-secondary/10 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">{client.name.charAt(0)}</div>
                      <div>
                        <p className="font-semibold group-hover:text-primary transition-colors">{client.name}</p>
                        <p className="text-xs text-foreground/50">{client.contactName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 font-medium text-foreground/70">
                      <MapPin className="w-4 h-4 text-primary" /> {client.venueCount || 0} Locations
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      client.status === "Active" ? "bg-emerald-500/10 text-emerald-500" : "bg-secondary text-foreground"
                    }`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-primary text-xs font-bold hover:underline">Manage</button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedClient && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedClientId(null)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-3xl bg-background border-l border-secondary shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-secondary flex justify-between items-center bg-secondary/5">
                <h2 className="text-2xl font-bold">{selectedClient.name}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditClientData(selectedClient); setIsEditModalOpen(true); }} className="p-2 hover:bg-secondary rounded-full" title="Edit Client"><Edit3 size={20} /></button>
                  <button onClick={() => handleDeleteClient(selectedClient.id)} className="p-2 hover:bg-red-500/10 text-red-500 rounded-full" title="Delete Client"><Trash2 size={20} /></button>
                  <button onClick={() => setSelectedClientId(null)} className="p-2 hover:bg-secondary rounded-full ml-4"><X size={24} /></button>
                </div>
              </div>

              <div className="flex border-b border-secondary px-6 pt-2 bg-secondary/5 overflow-x-auto">
                {[
                  { id: 'overview', label: 'Overview', icon: Settings },
                  { id: 'billing', label: 'Billing & Invoices', icon: DollarSign },
                  { id: 'preferred', label: 'Preferred Roster', icon: Heart },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-foreground/70 hover:text-foreground'
                    }`}
                  >
                    <tab.icon size={16} /> {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {activeTab === 'overview' && (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 rounded-xl border border-secondary bg-background">
                      <h4 className="text-xs font-bold text-foreground/50 mb-2">CONTACT</h4>
                      <p className="text-sm font-medium">{selectedClient.contactName}</p>
                      <p className="text-sm text-foreground/70">{selectedClient.email}</p>
                      <p className="text-sm text-foreground/70">{selectedClient.phone}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-secondary bg-background">
                      <h4 className="text-xs font-bold text-foreground/50 mb-2">ACCOUNT</h4>
                      <button onClick={() => toggleSuspend(selectedClient.id)} className={`w-full py-2 rounded-lg text-sm font-bold border transition-colors ${selectedClient.status === "Active" ? "border-red-500 text-red-500 hover:bg-red-500/10" : "border-emerald-500 text-emerald-500 hover:bg-emerald-500/10"}`}>
                        {selectedClient.status === "Active" ? "Suspend Account" : "Unsuspend Account"}
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'billing' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-lg">Invoice Generation</h4>
                      <button 
                        onClick={handleGenerateInvoice}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-sm disabled:opacity-50"
                      >
                        {isGenerating ? "Generating..." : "Generate New Invoice"}
                      </button>
                    </div>

                    <div className="space-y-3">
                      <h5 className="text-xs font-bold text-foreground/50 uppercase">History</h5>
                      {invoices.length === 0 ? (
                        <div className="py-12 text-center border border-dashed border-secondary rounded-2xl bg-secondary/5">
                          <p className="text-sm text-foreground/50">No invoices yet.</p>
                        </div>
                      ) : (
                        invoices.map(inv => (
                          <div key={inv.id} className="p-4 rounded-xl border border-secondary bg-background flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <CreditCard className="text-emerald-500" size={20} />
                              <div>
                                <p className="font-bold text-sm">{inv.id}</p>
                                <p className="text-[10px] text-foreground/50">{new Date(inv.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">${inv.amount.toLocaleString()}</p>
                              <p className={`text-[10px] font-black uppercase ${inv.status === 'Paid' ? 'text-emerald-500' : 'text-amber-500'}`}>{inv.status}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'preferred' && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-4">
                      <h4 className="font-bold text-lg">Priority Roster</h4>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30 w-4 h-4" />
                        <input 
                          type="text" 
                          value={workerSearch}
                          onChange={e => setWorkerSearch(e.target.value)}
                          placeholder="Search workers to add..." 
                          className="w-full pl-10 pr-4 py-2 bg-secondary/10 border border-secondary rounded-xl text-sm focus:outline-none focus:border-primary"
                        />
                        {workerSearch && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-secondary rounded-xl shadow-2xl z-10 max-h-48 overflow-y-auto">
                            {workers.filter(w => w.name.toLowerCase().includes(workerSearch.toLowerCase())).map(w => (
                              <button 
                                key={w.id}
                                onClick={() => { addToPreferred(w); setWorkerSearch(""); }}
                                className="w-full p-3 text-left hover:bg-primary/10 border-b border-secondary last:border-0 flex items-center justify-between group"
                              >
                                <span className="font-bold text-sm">{w.name}</span>
                                <Plus size={16} className="text-primary opacity-0 group-hover:opacity-100" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {selectedClient.preferredWorkers.length === 0 && (
                        <p className="text-center py-12 text-foreground/50 italic border border-dashed border-secondary rounded-2xl">No preferred workers added yet.</p>
                      )}
                      {selectedClient.preferredWorkers.map(w => (
                        <div key={w.id} className="p-4 rounded-xl border border-secondary bg-background flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{w.name.charAt(0)}</div>
                            <span className="font-bold text-sm">{w.name}</span>
                          </div>
                          <button onClick={() => removeFromPreferred(w.id)} className="p-2 text-foreground/20 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* EDIT CLIENT MODAL */}
      <AnimatePresence>
        {isEditModalOpen && editClientData && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card w-full max-w-lg rounded-2xl border border-secondary p-6 space-y-4">
              <h2 className="text-xl font-bold">Edit Client Details</h2>
              <div className="space-y-4">
                <input value={editClientData.name} onChange={e => setEditClientData({...editClientData, name: e.target.value})} placeholder="Company Name" className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none" />
                <input value={editClientData.contactName} onChange={e => setEditClientData({...editClientData, contactName: e.target.value})} placeholder="Contact Name" className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none" />
                <div className="grid grid-cols-2 gap-4">
                  <input value={editClientData.email} onChange={e => setEditClientData({...editClientData, email: e.target.value})} placeholder="Email" className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none" />
                  <input value={editClientData.phone} onChange={e => setEditClientData({...editClientData, phone: e.target.value})} placeholder="Phone" className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 font-bold text-foreground/50">Cancel</button>
                <button onClick={() => handleUpdateClient(editClientData)} className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-xl">Save Changes</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card w-full max-w-lg rounded-2xl border border-secondary p-6 space-y-4">
              <h2 className="text-xl font-bold">Add New Client</h2>
              <input value={newClientData.name} onChange={e => setNewClientData({...newClientData, name: e.target.value})} placeholder="Company Name" className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none" />
              <input value={newClientData.contactName} onChange={e => setNewClientData({...newClientData, contactName: e.target.value})} placeholder="Contact Person" className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <input value={newClientData.email} onChange={e => setNewClientData({...newClientData, email: e.target.value})} placeholder="Email" className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none" />
                <input value={newClientData.phone} onChange={e => setNewClientData({...newClientData, phone: e.target.value})} placeholder="Phone" className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 font-bold text-foreground/50">Cancel</button>
                <button onClick={handleAddClient} disabled={isAdding} className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-xl disabled:opacity-50">{isAdding ? "Saving..." : "Create Client"}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
