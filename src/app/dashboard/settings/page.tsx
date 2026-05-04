"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Shield, Bell, CreditCard, Puzzle, 
  Save, CheckCircle2,
  Users, Plus, Trash2, History
} from "lucide-react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "manager" });
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(data => setCurrentUser(data))
      .catch(console.error);

    fetch('/api/users')
      .then(res => res.ok ? res.json() : [])
      .then(data => setTeamUsers(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch('/api/audit')
      .then(res => res.ok ? res.json() : [])
      .then(data => setAuditLogs(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch('/api/invoices')
      .then(res => res.ok ? res.json() : [])
      .then(data => setInvoices(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1500);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingUser(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const createdUser = await res.json();
        setTeamUsers([...teamUsers, createdUser]);
        setNewUser({ name: "", email: "", password: "", role: "manager" });
      } else {
        alert("Failed to create user. Email may already exist.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { 
        method: 'DELETE'
      });
      if (res.ok) {
        setTeamUsers(teamUsers.filter(u => u.id !== id));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete user");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const tabs = [
    { id: "general", label: "General", icon: User },
    { id: "team", label: "Team & Roles", icon: Users, restricted: true },
    { id: "audit", label: "Audit Logs", icon: History, restricted: true },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "billing", label: "Billing & Plans", icon: CreditCard },
    { id: "integrations", label: "Integrations", icon: Puzzle },
  ].filter(tab => {
    if (!tab.restricted) return true;
    return currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-foreground/70 mt-1">Manage your platform configuration and preferences.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {saveSuccess && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-2 text-emerald-500 font-bold text-sm bg-emerald-500/10 px-3 py-1.5 rounded-full"
              >
                <CheckCircle2 className="w-4 h-4" />
                Saved!
              </motion.div>
            )}
          </AnimatePresence>
          
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Settings Sidebar */}
        <div className="w-full lg:w-64 shrink-0 space-y-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "hover:bg-secondary/50 text-foreground/70 hover:text-foreground"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Settings Content */}
        <div className="flex-1 glass border border-secondary rounded-3xl p-6 md:p-8 bg-background/50">
          <AnimatePresence mode="wait">
            {activeTab === "general" && (
              <motion.div 
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-xl font-bold mb-4">Platform Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground/70">Company Name</label>
                      <input 
                        type="text" 
                        defaultValue="PoweredByFerrari"
                        className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground/70">Support Email</label>
                      <input 
                        type="email" 
                        defaultValue="support@stafftracker.com"
                        className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-foreground/70">Timezone</label>
                      <select className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none focus:border-primary transition-colors appearance-none">
                        <option>Eastern Time (ET) - Toronto/New York</option>
                        <option>Pacific Time (PT) - Vancouver/LA</option>
                        <option>Central Time (CT) - Chicago</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "security" && (
              <motion.div 
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-xl font-bold mb-6">Security Settings</h3>
                  <div className="space-y-6">
                    <div className="p-6 bg-secondary/10 border border-secondary rounded-2xl flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-bold">Two-Factor Authentication (2FA)</p>
                        <p className="text-sm text-foreground/50">Add an extra layer of security to your account.</p>
                      </div>
                      <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm">Enable 2FA</button>
                    </div>
                    <div className="p-6 bg-secondary/10 border border-secondary rounded-2xl flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-bold">Session Management</p>
                        <p className="text-sm text-foreground/50">Log out from all other devices.</p>
                      </div>
                      <button className="px-4 py-2 border border-secondary rounded-lg font-bold text-sm hover:bg-secondary/50">Revoke All</button>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-bold text-sm text-foreground/70 uppercase tracking-wider">Change Password</h4>
                      <div className="grid grid-cols-1 gap-4">
                        <input type="password" placeholder="Current Password" className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none focus:border-primary" />
                        <input type="password" placeholder="New Password" className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none focus:border-primary" />
                        <button className="bg-primary text-primary-foreground font-bold py-3 rounded-xl">Update Password</button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div 
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-xl font-bold mb-6">Communication Preferences</h3>
                  <div className="space-y-4">
                    {[
                      { title: "New Job Post Alerts", desc: "Get notified when a client posts a new job.", default: true },
                      { title: "Shift Clock-In Overdue", desc: "Alert when a worker is late for their shift.", default: true },
                      { title: "Document Expiry", desc: "Notifications for expiring worker certifications.", default: false },
                      { title: "System Updates", desc: "Occasional news about platform improvements.", default: true },
                    ].map((item, i) => (
                      <div key={i} className="p-4 bg-secondary/10 border border-secondary rounded-xl flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-bold text-sm">{item.title}</p>
                          <p className="text-xs text-foreground/50">{item.desc}</p>
                        </div>
                        <div className="w-12 h-6 bg-primary/20 rounded-full relative cursor-pointer border border-primary/30">
                          <div className={`absolute top-1 ${item.default ? 'right-1 bg-primary' : 'left-1 bg-foreground/30'} w-4 h-4 rounded-full transition-all`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "billing" && (
              <motion.div 
                key="billing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-xl font-bold mb-6">Billing & Subscription</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="p-6 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/20 relative overflow-hidden">
                      <div className="relative z-10">
                        <p className="text-sm font-bold opacity-80 mb-2">CURRENT PLAN</p>
                        <h4 className="text-3xl font-black mb-4">Enterprise Pro</h4>
                        <p className="text-sm opacity-90 mb-6">Unlimited workers • Advanced AI Matchmaking • 24/7 Priority Support</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold">$499</span>
                          <span className="text-sm font-medium opacity-80">/ month</span>
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                        <CreditCard className="w-32 h-32 rotate-12" />
                      </div>
                    </div>
                    <div className="p-6 border-2 border-dashed border-secondary rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
                      <p className="text-sm text-foreground/50">Need a custom plan for more than 500 workers?</p>
                      <button className="px-6 py-2 border border-primary text-primary rounded-lg font-bold hover:bg-primary/5 transition-colors">Talk to Sales</button>
                    </div>
                  </div>

                  <h4 className="font-bold text-lg mb-4">Client Billing Records</h4>
                  <div className="bg-secondary/10 border border-secondary rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-secondary/20 border-b border-secondary">
                          <th className="p-4 font-bold">Invoice #</th>
                          <th className="p-4 font-bold">Client</th>
                          <th className="p-4 font-bold">Amount</th>
                          <th className="p-4 font-bold">Status</th>
                          <th className="p-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.length === 0 && (
                          <tr><td colSpan={5} className="p-12 text-center text-foreground/50 italic">No global billing records found.</td></tr>
                        )}
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="border-b border-secondary/50 last:border-0 hover:bg-secondary/5 transition-colors">
                            <td className="p-4 font-mono text-xs">{inv.id}</td>
                            <td className="p-4 font-medium">{inv.clientName}</td>
                            <td className="p-4 font-black">${inv.amount.toLocaleString()}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${inv.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                {inv.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button className="text-primary hover:underline font-bold text-xs">View Statement</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "team" && (
              <motion.div 
                key="team"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-xl font-bold mb-4">Team & Roles</h3>
                  <p className="text-sm text-foreground/70 mb-6">Create and manage sub-users for your portal. Managers can handle day-to-day operations but cannot make crucial destructive changes.</p>
                  
                  <div className="bg-secondary/10 border border-secondary rounded-xl overflow-hidden mb-8">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-secondary/20 border-b border-secondary">
                          <th className="p-4 font-bold text-sm">Name</th>
                          <th className="p-4 font-bold text-sm">Email</th>
                          <th className="p-4 font-bold text-sm">Role</th>
                          <th className="p-4 font-bold text-sm text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamUsers.map(user => (
                          <tr key={user.id} className="border-b border-secondary/50 last:border-0">
                            <td className="p-4 font-medium">{user.name}</td>
                            <td className="p-4 text-sm text-foreground/70">{user.email}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-md text-xs font-bold ${user.role === 'super_admin' ? 'bg-primary/20 text-primary' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                {user.role === 'super_admin' ? 'Super Admin' : 'Manager'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button 
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <form onSubmit={handleCreateUser} className="p-6 bg-secondary/10 border border-secondary rounded-xl space-y-4">
                    <h4 className="font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4"/> Add New User</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        required
                        placeholder="Full Name"
                        value={newUser.name}
                        onChange={e => setNewUser({...newUser, name: e.target.value})}
                        className="bg-background border border-secondary p-3 rounded-lg outline-none focus:border-primary"
                      />
                      <input 
                        type="email" 
                        required
                        placeholder="Email Address"
                        value={newUser.email}
                        onChange={e => setNewUser({...newUser, email: e.target.value})}
                        className="bg-background border border-secondary p-3 rounded-lg outline-none focus:border-primary"
                      />
                      <input 
                        type="password" 
                        required
                        placeholder="Temporary Password"
                        value={newUser.password}
                        onChange={e => setNewUser({...newUser, password: e.target.value})}
                        className="bg-background border border-secondary p-3 rounded-lg outline-none focus:border-primary"
                      />
                      <select 
                        value={newUser.role}
                        onChange={e => setNewUser({...newUser, role: e.target.value})}
                        className="bg-background border border-secondary p-3 rounded-lg outline-none focus:border-primary appearance-none"
                      >
                        <option value="manager">Manager (Operations only)</option>
                        <option value="admin">Admin (Advanced access)</option>
                        <option value="super_admin">Super Admin (Full control)</option>
                      </select>
                    </div>
                    <button 
                      type="submit" 
                      disabled={isAddingUser}
                      className="mt-4 bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isAddingUser ? "Creating..." : "Create User"}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {activeTab === "audit" && (
              <motion.div 
                key="audit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold">Audit Logs</h3>
                      <p className="text-sm text-foreground/70">Track all administrative actions and portal activity.</p>
                    </div>
                    <button 
                      onClick={() => {
                        fetch('/api/audit')
                          .then(res => res.json())
                          .then(data => setAuditLogs(Array.isArray(data) ? data : []));
                      }}
                      className="p-2 hover:bg-secondary rounded-lg transition-colors text-primary"
                    >
                      Refresh Logs
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {auditLogs.length === 0 && (
                      <div className="text-center py-20 border border-dashed border-secondary rounded-2xl">
                        <p className="text-foreground/50">No activity logs found yet.</p>
                      </div>
                    )}
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-4 rounded-xl border border-secondary bg-secondary/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-primary uppercase tracking-wider">{log.action}</span>
                            <span className="text-xs text-foreground/30">•</span>
                            <span className="text-xs text-foreground/50">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-sm font-medium">{log.details}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-bold">{log.userEmail}</p>
                            <p className="text-xs text-foreground/50">User ID: {log.userId}</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                            {log.userEmail.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "integrations" && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center py-20 text-center space-y-4"
              >
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                   <Puzzle className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold">Integrations Coming Soon</h3>
                <p className="text-foreground/50 max-w-md">
                  We are currently integrating with our payment and 3rd party API providers. 
                  This section will be available in the upcoming v2.0 release.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
