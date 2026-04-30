"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Shield, Bell, CreditCard, Puzzle, 
  Save, Key, CheckCircle2, AlertCircle, Smartphone, 
  Mail, Globe, Moon, Sun, Lock, Users, Plus, Trash2, History
} from "lucide-react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [notifications, setNotifications] = useState({
    email: true,
    sms: true,
    app: true,
    marketing: false
  });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1500);
  };

  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "manager" });

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setTeamUsers(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch('/api/audit')
      .then(res => res.json())
      .then(data => setAuditLogs(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingUser(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
        headers: { 
          'Content-Type': 'application/json',
          'x-user-email': typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('user') || '{}').email || 'admin@example.com') : 'system',
          'x-user-id': typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('user') || '{}').id || 'U-001') : 'system'
        }
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
        method: 'DELETE',
        headers: {
          'x-user-email': typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('user') || '{}').email || 'admin@example.com') : 'system',
          'x-user-id': typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('user') || '{}').id || 'U-001') : 'system'
        }
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
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{"role":"super_admin"}') : {role: "super_admin"};
    return user.role === 'super_admin';
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

            {activeTab === "security" && (
              <motion.div 
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-xl font-bold mb-4">Authentication</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-secondary bg-secondary/10">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-primary/20 text-primary rounded-lg">
                          <Lock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold">Password Reset</p>
                          <p className="text-sm text-foreground/50">Force password reset on next login</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-secondary rounded-lg font-bold text-sm hover:bg-secondary/80 transition-colors">
                        Trigger Reset
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 rounded-xl border border-secondary bg-secondary/10">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold">Two-Factor Authentication (2FA)</p>
                          <p className="text-sm text-foreground/50">Require 2FA for all admin accounts</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">Enabled</span>
                        <button className="text-sm font-bold text-foreground/50 hover:text-foreground">Configure</button>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-secondary/50" />

                <div>
                  <h3 className="text-xl font-bold mb-4 text-destructive">Danger Zone</h3>
                  <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-destructive">Purge Cache & Temporary Files</p>
                        <p className="text-sm text-foreground/50">Clear all system cache to free up space</p>
                      </div>
                      <button className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-bold text-sm hover:bg-destructive/90 transition-colors">
                        Clear Cache
                      </button>
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
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-bold mb-4">Notification Preferences</h3>
                
                <div className="space-y-4">
                  {[
                    { id: 'email', label: 'Email Notifications', desc: 'Receive daily summaries and critical alerts via email', icon: Mail },
                    { id: 'sms', label: 'SMS Alerts', desc: 'Get text messages for urgent shift issues', icon: Smartphone },
                    { id: 'app', label: 'In-App Notifications', desc: 'Show toast notifications while using the dashboard', icon: Bell },
                    { id: 'marketing', label: 'Marketing Updates', desc: 'Receive news about platform features and updates', icon: Globe },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-secondary hover:border-primary/30 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-secondary/50 rounded-lg">
                          <item.icon className="w-5 h-5 text-foreground/70" />
                        </div>
                        <div>
                          <p className="font-bold">{item.label}</p>
                          <p className="text-sm text-foreground/50">{item.desc}</p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => setNotifications({ ...notifications, [item.id as keyof typeof notifications]: !notifications[item.id as keyof typeof notifications] })}
                        className={`relative w-12 h-6 rounded-full transition-colors ${notifications[item.id as keyof typeof notifications] ? 'bg-primary' : 'bg-secondary'}`}
                      >
                        <motion.div 
                          className="absolute top-1 w-4 h-4 rounded-full bg-white"
                          animate={{ left: notifications[item.id as keyof typeof notifications] ? 24 : 4 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {(activeTab === "billing" || activeTab === "integrations") && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center py-20 text-center space-y-4"
              >
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                  {activeTab === "billing" ? <CreditCard className="w-8 h-8" /> : <Puzzle className="w-8 h-8" />}
                </div>
                <h3 className="text-2xl font-bold">Coming Soon</h3>
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
