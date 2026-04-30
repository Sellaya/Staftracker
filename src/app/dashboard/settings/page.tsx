"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Shield, Bell, CreditCard, Puzzle, 
  Save, Key, CheckCircle2, AlertCircle, Smartphone, 
  Mail, Globe, Moon, Sun, Lock
} from "lucide-react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [companyName, setCompanyName] = useState("PoweredByFerrari");
  const [supportEmail, setSupportEmail] = useState("support@stafftracker.com");
  const [timezone, setTimezone] = useState("Eastern Time (ET) - Toronto/New York");
  const [theme, setTheme] = useState("dark");
  const [notifications, setNotifications] = useState({
    email: true,
    sms: true,
    app: true,
    marketing: false
  });

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.companyName) setCompanyName(data.companyName);
        if (data.supportEmail) setSupportEmail(data.supportEmail);
        if (data.timezone) setTimezone(data.timezone);
        if (data.theme) setTheme(data.theme);
        if (data.notifications) setNotifications(data.notifications);
        
        // Apply theme to document
        if (data.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        companyName,
        supportEmail,
        timezone,
        theme,
        notifications
      };
      
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // Apply theme to document
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error(error);
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "general", label: "General", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "billing", label: "Billing & Plans", icon: CreditCard },
    { id: "integrations", label: "Integrations", icon: Puzzle },
  ];

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
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground/70">Support Email</label>
                      <input 
                        type="email" 
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-foreground/70">Timezone</label>
                      <select 
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full bg-secondary/20 border border-secondary p-3 rounded-xl outline-none focus:border-primary transition-colors appearance-none"
                      >
                        <option>Eastern Time (ET) - Toronto/New York</option>
                        <option>Pacific Time (PT) - Vancouver/LA</option>
                        <option>Central Time (CT) - Chicago</option>
                      </select>
                    </div>
                  </div>
                </div>

                <hr className="border-secondary/50" />

                <div>
                  <h3 className="text-xl font-bold mb-4">Appearance</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setTheme("dark")}
                      className={`p-4 rounded-xl border-2 flex items-center justify-center gap-3 font-bold transition-all ${
                        theme === "dark" ? "border-primary bg-primary/10 text-primary" : "border-secondary hover:border-foreground/30 text-foreground/70"
                      }`}
                    >
                      <Moon className="w-5 h-5" /> Dark Theme
                    </button>
                    <button 
                      onClick={() => setTheme("light")}
                      className={`p-4 rounded-xl border-2 flex items-center justify-center gap-3 font-bold transition-all ${
                        theme === "light" ? "border-primary bg-primary/10 text-primary" : "border-secondary hover:border-foreground/30 text-foreground/70"
                      }`}
                    >
                      <Sun className="w-5 h-5" /> Light Theme
                    </button>
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
