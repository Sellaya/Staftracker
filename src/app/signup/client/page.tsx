"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight, Building2, MapPin, Users, FileText } from "lucide-react";

export default function ClientSignup() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    companyName: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    billingEmail: "",
    venueName: "",
    venueType: "",
    address: "",
    roles: [] as string[],
    frequency: "1-5 shifts per month (Emergency Coverage)",
    uniform: "",
    instructions: "",
    parking: "",
  });

  const updateForm = (key: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (stepError) setStepError(null);
    if (submitError) setSubmitError(null);
  };

  const toggleRole = (role: string) => {
    const exists = formData.roles.includes(role);
    updateForm("roles", exists ? formData.roles.filter((r) => r !== role) : [...formData.roles, role]);
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.companyName || !formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.password) {
        return "Please complete all required company and contact fields.";
      }
      if (formData.password.length < 8) return "Password must be at least 8 characters.";
    }
    if (step === 2 && (!formData.venueName || !formData.venueType || !formData.address)) {
      return "Please complete all venue detail fields.";
    }
    if (step === 3 && formData.roles.length === 0) {
      return "Select at least one staffing role.";
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    setStep(s => Math.min(4, s + 1));
  };
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep();
    if (err) {
      setStepError(err);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/signup/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error || "Unable to submit registration.");
        return;
      }
      setStep(5);
    } catch {
      setSubmitError("Unable to submit registration right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Navigation */}
      <nav className="w-full px-8 py-6 flex justify-between items-center border-b border-secondary/30">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-black text-sm">
            ST
          </div>
          <span className="font-bold tracking-tight text-foreground">Staff Tracker</span>
        </Link>
        {step < 5 && (
          <Link href="/" className="text-sm font-bold text-foreground/50 hover:text-foreground flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        )}
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-4 py-12">
        <div className="w-full max-w-2xl">
          
          {/* PROGRESS BAR */}
          <AnimatePresence>
            {step < 5 && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-12"
              >
                <div className="flex justify-between items-end mb-4">
                  <h1 className="text-3xl font-bold">Venue Registration</h1>
                  <span className="text-sm font-bold text-foreground/50">Step {step} of 4</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden flex">
                  <div className={`h-full bg-accent transition-all duration-500`} style={{ width: `${(step / 4) * 100}%` }} />
                </div>
                
                <div className="flex justify-between mt-4 text-[10px] sm:text-xs font-bold text-foreground/40 hidden sm:flex">
                  <span className={step >= 1 ? "text-accent" : ""}>Company Info</span>
                  <span className={step >= 2 ? "text-accent" : ""}>Location details</span>
                  <span className={step >= 3 ? "text-accent" : ""}>Staffing Profile</span>
                  <span className={step >= 4 ? "text-accent" : ""}>Logistics</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* STEP 1: COMPANY INFO */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="p-8 glass bg-background/50 border border-secondary rounded-3xl shadow-xl hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-accent/10 text-accent rounded-xl"><Building2 className="w-6 h-6"/></div>
                    <h2 className="text-xl font-bold">Corporate & Manager Details</h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-1">LEGAL COMPANY NAME (FOR INVOICING)</label>
                      <input type="text" value={formData.companyName} onChange={(e) => updateForm("companyName", e.target.value)} placeholder="1234567 Ontario Inc." className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-accent outline-none transition-colors" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-foreground/70 mb-1">FIRST NAME</label>
                        <input type="text" value={formData.firstName} onChange={(e) => updateForm("firstName", e.target.value)} placeholder="Sarah" className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-accent outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-foreground/70 mb-1">LAST NAME</label>
                        <input type="text" value={formData.lastName} onChange={(e) => updateForm("lastName", e.target.value)} placeholder="Connor" className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-accent outline-none transition-colors" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-foreground/70 mb-1">WORK EMAIL</label>
                        <input type="email" value={formData.email} onChange={(e) => updateForm("email", e.target.value)} placeholder="manager@venue.com" className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-accent outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-foreground/70 mb-1">DIRECT PHONE NUMBER</label>
                        <input type="tel" value={formData.phone} onChange={(e) => updateForm("phone", e.target.value)} placeholder="(416) 555-0198" className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-accent outline-none transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-1">PASSWORD</label>
                      <input type="password" value={formData.password} onChange={(e) => updateForm("password", e.target.value)} placeholder="At least 8 characters" className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-accent outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-1">A/P OR BILLING EMAIL (OPTIONAL)</label>
                      <input type="email" value={formData.billingEmail} onChange={(e) => updateForm("billingEmail", e.target.value)} placeholder="accounting@venue.com" className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-accent outline-none transition-colors" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={nextStep} className="px-8 py-4 bg-accent text-background rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-accent/20 transition-all">
                    Continue to Location Details <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: LOCATION DETAILS */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="p-8 glass bg-background/50 border border-secondary rounded-3xl shadow-xl hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-accent/10 text-accent rounded-xl"><MapPin className="w-6 h-6"/></div>
                    <h2 className="text-xl font-bold">Venue Details</h2>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-1">OPERATING VENUE NAME (PUBLIC)</label>
                      <input type="text" value={formData.venueName} onChange={(e) => updateForm("venueName", e.target.value)} placeholder="Your venue name" className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-accent outline-none transition-colors" />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-2">VENUE CLASSIFICATION</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {["Restaurant", "Bar / Nightclub", "Hotel", "Event Space", "Catering Co.", "Cafe / Bakery"].map(type => (
                          <label key={type} className="flex items-center gap-2 p-3 border border-secondary rounded-xl cursor-pointer hover:bg-secondary/20 transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/5">
                            <input type="radio" name="venueType" checked={formData.venueType === type} onChange={() => updateForm("venueType", type)} className="w-4 h-4 rounded-full text-accent focus:ring-accent accent-accent" />
                            <span className="text-sm font-medium">{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-1">FULL PHYSICAL ADDRESS (TORONTO & GTA)</label>
                      <textarea value={formData.address} onChange={(e) => updateForm("address", e.target.value)} placeholder="123 King St W, Toronto, ON M5V 1J5" className="w-full h-24 p-3 bg-background border border-secondary rounded-xl focus:border-accent outline-none transition-colors resize-none" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <button onClick={prevStep} className="px-8 py-4 border border-secondary rounded-xl font-bold flex items-center gap-2 hover:bg-secondary/50 transition-all">
                    Back
                  </button>
                  <button onClick={nextStep} className="px-8 py-4 bg-accent text-background rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-accent/20 transition-all">
                    Continue to Staffing Needs <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: STAFFING NEEDS */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="p-8 glass bg-background/50 border border-secondary rounded-3xl shadow-xl hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-accent/10 text-accent rounded-xl"><Users className="w-6 h-6"/></div>
                    <h2 className="text-xl font-bold">Staffing Profile</h2>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-2">WHICH ROLES DO YOU TYPICALLY REQUIRE?</label>
                      <div className="grid grid-cols-2 gap-3">
                        {["Bartender", "Server", "Host / Hostess", "Line Cook", "Prep Cook", "Dishwasher", "Security", "Barback"].map(role => (
                          <label key={role} className="flex items-center gap-3 p-4 border border-secondary rounded-xl cursor-pointer hover:border-accent/50 transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/5">
                            <input type="checkbox" checked={formData.roles.includes(role)} onChange={() => toggleRole(role)} className="w-5 h-5 rounded text-accent focus:ring-accent accent-accent" />
                            <span className="font-bold">{role}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-1">EXPECTED FREQUENCY OF NEEDS</label>
                      <select value={formData.frequency} onChange={(e) => updateForm("frequency", e.target.value)} className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-accent outline-none transition-colors appearance-none cursor-pointer">
                        <option>One-off special events / Seasonal</option>
                        <option>1-5 shifts per month (Emergency Coverage)</option>
                        <option>5-20 shifts per month (Regular Supplemental)</option>
                        <option>20+ shifts per month (High Volume / Core Staffing)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <button onClick={prevStep} className="px-8 py-4 border border-secondary rounded-xl font-bold flex items-center gap-2 hover:bg-secondary/50 transition-all">
                    Back
                  </button>
                  <button onClick={nextStep} className="px-8 py-4 bg-accent text-background rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-accent/20 transition-all">
                    Continue to Logistics <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: LOGISTICS */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="p-8 glass bg-background/50 border border-secondary rounded-3xl shadow-xl hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-accent/10 text-accent rounded-xl"><FileText className="w-6 h-6"/></div>
                    <h2 className="text-xl font-bold">Venue Logistics</h2>
                  </div>
                  <div className="space-y-6">
                    
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-1">MANDATORY UNIFORM / DRESS CODE</label>
                      <input type="text" value={formData.uniform} onChange={(e) => updateForm("uniform", e.target.value)} placeholder="e.g. All black, non-slip shoes, black tie provided." className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-accent outline-none transition-colors" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-1">ARRIVAL INSTRUCTIONS FOR WORKERS</label>
                      <textarea value={formData.instructions} onChange={(e) => updateForm("instructions", e.target.value)} placeholder="e.g. Enter through the back alley door. Ask for Dave upon arrival." className="w-full h-20 p-3 bg-background border border-secondary rounded-xl focus:border-accent outline-none transition-colors resize-none" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-1">PARKING INFORMATION</label>
                      <input type="text" value={formData.parking} onChange={(e) => updateForm("parking", e.target.value)} placeholder="e.g. No onsite parking, Green P lot nearby." className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-accent outline-none transition-colors" />
                    </div>

                  </div>
                </div>
                <div className="flex justify-between">
                  <button onClick={prevStep} className="px-8 py-4 border border-secondary rounded-xl font-bold flex items-center gap-2 hover:bg-secondary/50 transition-all">
                    Back
                  </button>
                  <button onClick={handleSubmit} disabled={isSubmitting} className="px-8 py-4 bg-accent text-background rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-accent/20 transition-all disabled:opacity-50">
                    {isSubmitting ? "Submitting Registration..." : "Submit Registration"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: SUCCESS */}
            {step === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col items-center text-center py-12">
                <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h1 className="text-4xl font-black mb-4">Registration Submitted!</h1>
                <p className="text-lg text-foreground/70 mb-8 max-w-md mx-auto">
                  Your client account and first venue were created. You can now login and start posting jobs that workers can view and apply to.
                </p>
                <Link href="/login/client" className="px-8 py-4 bg-accent text-background rounded-xl font-bold hover:opacity-90 transition-all">
                  Login to Client Dashboard
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
          {stepError && (
            <div className="mt-4 p-4 border border-amber-500/30 bg-amber-500/10 text-amber-600 rounded-xl text-sm font-bold">
              {stepError}
            </div>
          )}
          {submitError && (
            <div className="mt-4 p-4 border border-red-500/30 bg-red-500/10 text-red-600 rounded-xl text-sm font-bold">
              {submitError}
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center border-t border-secondary/30 mt-auto">
        <p className="text-xs font-bold text-foreground/40 tracking-widest uppercase">
          Powered by <span className="text-foreground/80">Ferrari</span>
        </p>
      </footer>
    </div>
  );
}
