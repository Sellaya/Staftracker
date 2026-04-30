"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, Search, Filter, MoreVertical, MapPin, DollarSign, Settings,
  X, UserCircle, Star, History, FileText, ShieldAlert, Edit3, Trash2, Check,
  CreditCard, Users, Briefcase, RefreshCcw, Heart
} from "lucide-react";

// Types
type Invoice = { id: string, amount: string, status: "Paid" | "Pending" | "Failed", date: string };
type Rate = { role: string, rate: number };

type Client = {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  status: "Active" | "Suspended" | "Pending Payment";
  feePercentage: number;
  paymentMethod: string;
  customRates: Rate[];
  preferredWorkers: { id: string, name: string }[];
  invoices: Invoice[];
  venueCount: number;
};

// Mock Data
const INITIAL_CLIENTS: Client[] = [];

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    paymentMethod: "Credit Card",
    feePercentage: 20
  });

  // Fetch clients on mount
  useEffect(() => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => {
        if(Array.isArray(data)) setClients(data);
      })
      .catch(console.error);
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("All"); 
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview"); 
  
  // Edit State
  const [editingFee, setEditingFee] = useState(false);
  const [tempFee, setTempFee] = useState(0);

  // Derived State
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.contactName.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filter === "All") return true;
      if (filter === "Active") return c.status === "Active";
      if (filter === "Suspended") return c.status === "Suspended";
      if (filter === "Pending Payment") return c.status === "Pending Payment" || c.invoices.some(i => i.status === "Failed");
      
      return true;
    });
  }, [clients, searchQuery, filter]);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Actions
  const toggleSuspend = (id: string) => {
    setClients(clients.map(c => c.id === id ? { ...c, status: c.status === "Active" ? "Suspended" : "Active" } : c));
  };

  const saveFee = (id: string) => {
    setClients(clients.map(c => c.id === id ? { ...c, feePercentage: tempFee } : c));
    setEditingFee(false);
  };

  const retryPayment = (clientId: string, invoiceId: string) => {
    // Mock successful retry after a delay
    setTimeout(() => {
      setClients(clients.map(c => {
        if (c.id === clientId) {
          const updatedInvoices = c.invoices.map(i => i.id === invoiceId ? { ...i, status: "Paid" as const } : i);
          const hasFailed = updatedInvoices.some(i => i.status === "Failed");
          return { ...c, invoices: updatedInvoices, status: hasFailed ? "Pending Payment" : "Active" };
        }
        return c;
      }));
    }, 1500);
  };

  const removePreferredWorker = (clientId: string, workerId: string) => {
    setClients(clients.map(c => {
      if (c.id === clientId) {
        return { ...c, preferredWorkers: c.preferredWorkers.filter(w => w.id !== workerId) };
      }
      return c;
    }));
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClientData)
      });
      const addedClient = await res.json();
      setClients([...clients, addedClient]);
      setIsAddModalOpen(false);
      setNewClientData({ name: "", contactName: "", email: "", phone: "", paymentMethod: "Credit Card", feePercentage: 20 });
    } catch (error) {
      console.error(error);
    } finally {
      setIsAdding(false);
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
              placeholder="Search clients by name or contact..." 
              className="w-full pl-10 pr-4 py-2 bg-background border border-secondary rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {["All", "Active", "Pending Payment", "Suspended"].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
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
                <th className="px-6 py-4 font-medium">Platform Fee</th>
                <th className="px-6 py-4 font-medium">Payment Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client, i) => {
                const hasFailedInvoice = client.invoices.some(inv => inv.status === "Failed");
                
                return (
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
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold group-hover:text-primary transition-colors">{client.name}</p>
                        <p className="text-xs text-foreground/50">{client.contactName} • {client.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 font-medium text-foreground/70">
                      <MapPin className="w-4 h-4 text-primary" /> {client.venueCount} Locations
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold">
                    <span className="bg-secondary/50 px-2 py-1 rounded-md">{client.feePercentage}%</span>
                  </td>
                  <td className="px-6 py-4">
                    {hasFailedInvoice ? (
                      <span className="flex items-center gap-1 text-red-500 font-bold text-xs bg-red-500/10 px-2.5 py-1 rounded-full w-fit">
                        <ShieldAlert className="w-3 h-3"/> Payment Failed
                      </span>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        client.status === "Active" ? "bg-emerald-500/10 text-emerald-500" : "bg-secondary text-foreground"
                      }`}>
                        {client.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-primary text-xs font-bold hover:underline">Manage</button>
                  </td>
                </motion.tr>
              )})}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-foreground/50">
                    No clients found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Panel Overlay for Client Profile */}
      <AnimatePresence>
        {selectedClient && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedClientId(null); setEditingFee(false); }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-3xl bg-background border-l border-secondary shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              {/* Panel Header */}
              <div className="p-6 border-b border-secondary flex justify-between items-start bg-secondary/5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-2xl">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      {selectedClient.name}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        selectedClient.status === "Active" ? "bg-emerald-500/10 text-emerald-500" : 
                        selectedClient.status === "Pending Payment" ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                      }`}>
                        {selectedClient.status}
                      </span>
                    </h2>
                    <p className="text-foreground/50 font-mono text-sm">{selectedClient.id} • {selectedClient.contactName}</p>
                  </div>
                </div>
                <button onClick={() => { setSelectedClientId(null); setEditingFee(false); }} className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Panel Tabs */}
              <div className="flex border-b border-secondary px-6 pt-2 bg-secondary/5 overflow-x-auto hide-scrollbar">
                {[
                  { id: 'overview', label: 'Overview & Settings', icon: Settings },
                  { id: 'billing', label: 'Billing & Rates', icon: DollarSign },
                  { id: 'preferred', label: 'Preferred Workers', icon: Heart },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-foreground/70 hover:text-foreground'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" /> {tab.label}
                  </button>
                ))}
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl border border-secondary bg-background">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-bold text-foreground/50">COMPANY CONTACT</h4>
                            <button className="text-primary hover:underline text-xs font-bold">Edit</button>
                          </div>
                          <p className="text-sm font-medium">{selectedClient.contactName}</p>
                          <p className="text-sm text-foreground/70">{selectedClient.email}</p>
                          <p className="text-sm text-foreground/70">{selectedClient.phone}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 rounded-xl border border-secondary bg-background">
                          <h4 className="text-xs font-bold text-foreground/50 mb-4">ACCOUNT STATUS</h4>
                          <button 
                            onClick={() => toggleSuspend(selectedClient.id)}
                            className={`w-full py-2.5 rounded-lg text-sm font-bold border transition-colors ${
                              selectedClient.status === "Active" 
                                ? "border-red-500/50 text-red-500 hover:bg-red-500/10" 
                                : "border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10"
                            }`}
                          >
                            {selectedClient.status === "Active" ? "Suspend Account (Block Shifts)" : "Unsuspend Account"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-secondary pt-6">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-bold flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" /> Venues ({selectedClient.venueCount})
                        </h4>
                        <button className="text-xs font-bold text-primary hover:underline">Manage in Venues &rarr;</button>
                      </div>
                      <div className="p-8 border border-dashed border-secondary rounded-xl flex flex-col items-center justify-center text-foreground/50 bg-secondary/5">
                        <Building2 className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">Venues are managed in the global Venue Management module.</p>
                      </div>
                    </div>
                  </>
                )}

                {/* BILLING & RATES TAB */}
                {activeTab === 'billing' && (
                  <div className="space-y-8">
                    
                    {/* Platform Fee Config */}
                    <div className="p-5 rounded-2xl border border-secondary bg-background flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h4 className="font-bold flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-emerald-500" /> Platform Fee Percentage
                        </h4>
                        <p className="text-sm text-foreground/70 mt-1">The cut the platform takes from this client's total billings.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {editingFee ? (
                          <>
                            <input 
                              type="number" 
                              value={tempFee} 
                              onChange={e => setTempFee(Number(e.target.value))}
                              className="w-20 px-3 py-1.5 bg-background border border-primary rounded text-sm focus:outline-none"
                            />
                            <span className="font-bold">%</span>
                            <button onClick={() => saveFee(selectedClient.id)} className="p-1.5 bg-emerald-500/20 text-emerald-500 rounded hover:bg-emerald-500/30">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingFee(false)} className="p-1.5 bg-secondary text-foreground/70 rounded hover:text-foreground">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-3xl font-black">{selectedClient.feePercentage}%</span>
                            <button onClick={() => { setTempFee(selectedClient.feePercentage); setEditingFee(true); }} className="p-2 hover:bg-secondary rounded-lg transition-colors text-foreground/50 hover:text-primary" title="Edit Fee">
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Custom Hourly Rates */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-bold flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-primary" /> Custom Hourly Rates
                        </h4>
                        <button className="text-xs font-bold text-primary hover:underline">+ Add Custom Rate</button>
                      </div>
                      
                      {selectedClient.customRates.length > 0 ? (
                        <div className="space-y-2">
                          {selectedClient.customRates.map(rate => (
                            <div key={rate.role} className="flex justify-between items-center p-3 rounded-lg border border-secondary bg-secondary/5">
                              <span className="font-medium text-sm">{rate.role}</span>
                              <div className="flex items-center gap-4">
                                <span className="font-bold">${rate.rate}/hr</span>
                                <button className="text-foreground/50 hover:text-primary"><Edit3 className="w-4 h-4"/></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-foreground/50 p-4 border border-dashed border-secondary rounded-xl text-center">
                          Using default platform rates for all roles.
                        </p>
                      )}
                    </div>

                    {/* Invoices */}
                    <div>
                      <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
                        <FileText className="w-4 h-4 text-primary" /> Recent Invoices
                      </h4>
                      <div className="space-y-3">
                        {selectedClient.invoices.map(inv => (
                          <div key={inv.id} className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                            inv.status === "Failed" ? "bg-red-500/5 border-red-500/30" : 
                            inv.status === "Pending" ? "bg-amber-500/5 border-amber-500/20" : "bg-secondary/5 border-secondary"
                          }`}>
                            <div>
                              <p className="font-bold flex items-center gap-2">
                                {inv.id} 
                                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-black ${
                                  inv.status === "Failed" ? "bg-red-500 text-white" : 
                                  inv.status === "Paid" ? "bg-emerald-500/20 text-emerald-500" : "bg-amber-500/20 text-amber-500"
                                }`}>
                                  {inv.status}
                                </span>
                              </p>
                              <p className="text-xs text-foreground/70 mt-1">Billed on {inv.date}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-black text-lg">{inv.amount}</span>
                              {inv.status === "Failed" && (
                                <button 
                                  onClick={() => retryPayment(selectedClient.id, inv.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                  <RefreshCcw className="w-3 h-3" /> Retry
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-foreground/50 mt-4 flex items-center gap-1">
                        <CreditCard className="w-3 h-3"/> Payment Method: {selectedClient.paymentMethod}
                      </p>
                    </div>

                  </div>
                )}

                {/* PREFERRED WORKERS TAB */}
                {activeTab === 'preferred' && (
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20">
                      <h4 className="font-bold flex items-center gap-2 text-primary mb-2">
                        <Heart className="w-5 h-5 fill-primary" /> Preferred Roster
                      </h4>
                      <p className="text-sm text-foreground/70">
                        When this client posts a shift, these workers will receive an exclusive priority notification 2 hours before the shift is broadcasted to the general pool.
                      </p>
                    </div>

                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm">Workers ({selectedClient.preferredWorkers.length})</h4>
                      <button className="text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground px-3 py-1.5 rounded-lg transition-colors">
                        + Add Worker
                      </button>
                    </div>

                    <div className="space-y-2">
                      {selectedClient.preferredWorkers.length > 0 ? (
                        selectedClient.preferredWorkers.map(worker => (
                          <div key={worker.id} className="flex justify-between items-center p-4 rounded-xl border border-secondary bg-background hover:bg-secondary/5 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                {worker.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{worker.name}</p>
                                <p className="text-xs text-foreground/50 font-mono">{worker.id}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => removePreferredWorker(selectedClient.id, worker.id)}
                              className="text-xs font-bold text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-foreground/50 p-8 border border-dashed border-secondary rounded-xl text-center">
                          No preferred workers added yet.
                        </p>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ADD NEW CLIENT MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-lg rounded-2xl border border-secondary shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-secondary flex justify-between items-center bg-secondary/10 shrink-0">
                <h2 className="text-xl font-bold">Add New Client</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <form id="add-client-form" onSubmit={handleAddClient} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground/70">Company Name</label>
                    <input 
                      required
                      type="text"
                      value={newClientData.name}
                      onChange={e => setNewClientData({...newClientData, name: e.target.value})}
                      className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none focus:border-primary transition-colors"
                      placeholder="e.g. Grand Hotel"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground/70">Contact Name</label>
                    <input 
                      required
                      type="text"
                      value={newClientData.contactName}
                      onChange={e => setNewClientData({...newClientData, contactName: e.target.value})}
                      className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none focus:border-primary transition-colors"
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground/70">Email</label>
                      <input 
                        required
                        type="email"
                        value={newClientData.email}
                        onChange={e => setNewClientData({...newClientData, email: e.target.value})}
                        className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none focus:border-primary transition-colors"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground/70">Phone</label>
                      <input 
                        required
                        type="tel"
                        value={newClientData.phone}
                        onChange={e => setNewClientData({...newClientData, phone: e.target.value})}
                        className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none focus:border-primary transition-colors"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground/70">Fee Percentage (%)</label>
                      <input 
                        required
                        type="number"
                        min="0"
                        max="100"
                        value={newClientData.feePercentage}
                        onChange={e => setNewClientData({...newClientData, feePercentage: Number(e.target.value)})}
                        className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground/70">Payment Method</label>
                      <select 
                        value={newClientData.paymentMethod}
                        onChange={e => setNewClientData({...newClientData, paymentMethod: e.target.value})}
                        className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none focus:border-primary transition-colors appearance-none"
                      >
                        <option>Credit Card</option>
                        <option>ACH Transfer</option>
                        <option>Invoice (Net 30)</option>
                      </select>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-secondary bg-secondary/10 shrink-0 flex justify-end gap-3">
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-foreground/70 hover:bg-secondary/50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  form="add-client-form"
                  type="submit"
                  disabled={isAdding}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isAdding && <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
                  Create Client
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
