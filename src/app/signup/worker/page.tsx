"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight, User, MapPin, Briefcase, FileCheck, Shield, UploadCloud, Link as LinkIcon, FileText } from "lucide-react";

export default function WorkerSignup() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // File mock states
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [extraDocFileName, setExtraDocFileName] = useState<string | null>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const extraDocInputRef = useRef<HTMLInputElement>(null);

  const TOTAL_STEPS = 5;

  const nextStep = () => setStep(s => Math.min(TOTAL_STEPS, s + 1));
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setStep(TOTAL_STEPS + 1); // Success state
      } else {
        const data = await res.json();
        alert(data.error || "Failed to submit");
      }
    } catch (error) {
      alert("Error submitting application");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (name: string) => void) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0].name);
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
        {step <= TOTAL_STEPS && (
          <Link href="/" className="text-sm font-bold text-foreground/50 hover:text-foreground flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        )}
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-4 py-12">
        <div className="w-full max-w-2xl">
          
          {/* PROGRESS BAR */}
          <AnimatePresence>
            {step <= TOTAL_STEPS && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-12"
              >
                <div className="flex justify-between items-end mb-4">
                  <h1 className="text-3xl font-bold">Worker Registration</h1>
                  <span className="text-sm font-bold text-foreground/50">Step {step} of {TOTAL_STEPS}</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden flex">
                  <div className={`h-full bg-primary transition-all duration-500`} style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
                </div>
                
                <div className="flex justify-between mt-4 text-[10px] sm:text-xs font-bold text-foreground/40 hidden sm:flex">
                  <span className={step >= 1 ? "text-primary" : ""}>Account</span>
                  <span className={step >= 2 ? "text-primary" : ""}>Legal & Identity</span>
                  <span className={step >= 3 ? "text-primary" : ""}>Location</span>
                  <span className={step >= 4 ? "text-primary" : ""}>Experience</span>
                  <span className={step >= 5 ? "text-primary" : ""}>Certifications</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* STEP 1: ACCOUNT */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="p-8 glass bg-background/50 border border-secondary rounded-3xl shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl"><User className="w-6 h-6"/></div>
                    <h2 className="text-xl font-bold">Basic Information</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-foreground/70 mb-1">FIRST NAME</label>
                        <input type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} placeholder="John" className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-foreground/70 mb-1">LAST NAME</label>
                        <input type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} placeholder="Doe" className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-1">EMAIL ADDRESS</label>
                      <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="john@example.com" className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-1">PHONE NUMBER</label>
                      <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="(416) 555-0198" className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-1">PASSWORD</label>
                      <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={nextStep} className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all">
                    Continue to Legal & Identity <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: LEGAL & IDENTITY */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="p-8 glass bg-background/50 border border-secondary rounded-3xl shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl"><Shield className="w-6 h-6"/></div>
                    <h2 className="text-xl font-bold">Legal Status & Social</h2>
                  </div>
                  <div className="space-y-6">
                    
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-1">LEGAL STATUS IN CANADA</label>
                      <select className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors appearance-none cursor-pointer">
                        <option value="">Select your status...</option>
                        <option value="citizen">Canadian Citizen</option>
                        <option value="pr">Permanent Resident</option>
                        <option value="work_permit">Open Work Permit</option>
                        <option value="student">Student Visa (with work authorization)</option>
                        <option value="other">Other Valid Work Authorization</option>
                      </select>
                      <p className="text-xs text-amber-500 mt-2 font-medium">
                        * You may be required to upload proof of work authorization during onboarding.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-1">LINKEDIN PROFILE (OPTIONAL)</label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                        <input type="url" placeholder="https://linkedin.com/in/username" className="w-full pl-10 pr-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors" />
                      </div>
                      <p className="text-xs text-foreground/50 mt-1">A LinkedIn profile can help speed up the verification process.</p>
                    </div>

                  </div>
                </div>
                <div className="flex justify-between">
                  <button onClick={prevStep} className="px-8 py-4 border border-secondary rounded-xl font-bold flex items-center gap-2 hover:bg-secondary/50 transition-all">
                    Back
                  </button>
                  <button onClick={nextStep} className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all">
                    Continue to Location <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: LOCATION */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="p-8 glass bg-background/50 border border-secondary rounded-3xl shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl"><MapPin className="w-6 h-6"/></div>
                    <h2 className="text-xl font-bold">Toronto Logistics</h2>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-1">HOME POSTAL CODE (FIRST 3 DIGITS)</label>
                      <input type="text" placeholder="e.g. M5V" maxLength={3} className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors uppercase" />
                      <p className="text-xs text-foreground/50 mt-1">Used to calculate commute times and match you with nearby venues.</p>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-2">NEIGHBORHOODS WILLING TO WORK IN</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {["Downtown Core", "King West", "Queen West", "Yorkville", "The Danforth", "Liberty Village", "Midtown", "North York", "Etobicoke"].map(hood => (
                          <label key={hood} className="flex items-center gap-2 p-3 border border-secondary rounded-xl cursor-pointer hover:bg-secondary/20 transition-colors">
                            <input type="checkbox" className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary" />
                            <span className="text-sm font-medium">{hood}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <button onClick={prevStep} className="px-8 py-4 border border-secondary rounded-xl font-bold flex items-center gap-2 hover:bg-secondary/50 transition-all">
                    Back
                  </button>
                  <button onClick={nextStep} className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all">
                    Continue to Experience <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: EXPERIENCE & RESUME */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="p-8 glass bg-background/50 border border-secondary rounded-3xl shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl"><Briefcase className="w-6 h-6"/></div>
                    <h2 className="text-xl font-bold">Experience & Resume</h2>
                  </div>
                  <div className="space-y-6">
                    
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-2">PRIMARY ROLES (SELECT ALL THAT APPLY)</label>
                      <div className="grid grid-cols-2 gap-3">
                        {["Bartender", "Server", "Host / Hostess", "Line Cook", "Prep Cook", "Dishwasher", "Security", "Barback"].map(role => (
                          <label key={role} className="flex items-center gap-3 p-4 border border-secondary rounded-xl cursor-pointer hover:border-primary/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                            <input type="checkbox" className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary" />
                            <span className="font-bold">{role}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-1">YEARS OF HOSPITALITY EXPERIENCE</label>
                      <select className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors appearance-none cursor-pointer">
                        <option>Less than 1 year</option>
                        <option>1 - 3 years</option>
                        <option>3 - 5 years</option>
                        <option>5+ years</option>
                      </select>
                    </div>

                    <div className="pt-4 border-t border-secondary/50">
                      <label className="block text-xs font-bold text-foreground/70 mb-2">UPLOAD RESUME (PDF OR DOCX)</label>
                      <input type="file" ref={resumeInputRef} className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => handleFileUpload(e, setResumeFileName)} />
                      <div 
                        onClick={() => resumeInputRef.current?.click()}
                        className={`w-full p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${resumeFileName ? 'border-primary bg-primary/5' : 'border-secondary hover:bg-secondary/10'}`}
                      >
                        {resumeFileName ? (
                          <>
                            <FileText className="w-8 h-8 text-primary mb-2" />
                            <span className="font-bold text-primary">{resumeFileName}</span>
                            <span className="text-xs text-foreground/50 mt-1">Click to replace file</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-8 h-8 text-foreground/40 mb-2" />
                            <span className="font-bold text-foreground/70">Click to browse or drag and drop</span>
                            <span className="text-xs text-foreground/50 mt-1">Maximum file size: 5MB</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground/70 mb-2">ANY OTHER DOCUMENTS OR BIO INFO? (OPTIONAL)</label>
                      <input type="file" ref={extraDocInputRef} className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={(e) => handleFileUpload(e, setExtraDocFileName)} />
                      {extraDocFileName ? (
                        <div className="flex justify-between items-center p-3 border border-secondary rounded-xl bg-secondary/10">
                          <span className="text-sm font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-primary"/> {extraDocFileName}</span>
                          <button onClick={() => setExtraDocFileName(null)} className="text-xs text-red-500 font-bold hover:underline">Remove</button>
                        </div>
                      ) : (
                        <button onClick={() => extraDocInputRef.current?.click()} className="w-full px-4 py-3 border border-secondary rounded-xl text-sm font-bold text-foreground/70 hover:bg-secondary/10 transition-colors flex items-center justify-center gap-2">
                          <UploadCloud className="w-4 h-4" /> Upload Additional Document
                        </button>
                      )}
                      <textarea placeholder="Tell us a bit about yourself or add links to your portfolio..." className="w-full h-24 mt-3 p-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors resize-none text-sm" />
                    </div>

                  </div>
                </div>
                <div className="flex justify-between">
                  <button onClick={prevStep} className="px-8 py-4 border border-secondary rounded-xl font-bold flex items-center gap-2 hover:bg-secondary/50 transition-all">
                    Back
                  </button>
                  <button onClick={nextStep} className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all">
                    Continue to Certifications <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: CERTIFICATIONS */}
            {step === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="p-8 glass bg-background/50 border border-secondary rounded-3xl shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl"><FileCheck className="w-6 h-6"/></div>
                    <h2 className="text-xl font-bold">Ontario Certifications</h2>
                  </div>
                  <div className="space-y-6">
                    <div className="p-5 border border-secondary rounded-2xl bg-secondary/5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold">SmartServe Certification</h4>
                          <p className="text-xs text-foreground/50">Required for Bartenders and Servers in Ontario.</p>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-sm font-bold text-primary">I have this</span>
                          <input type="checkbox" className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary" />
                        </label>
                      </div>
                      <input type="text" placeholder="Enter Registration Number (Optional)" className="w-full px-4 py-2.5 bg-background border border-secondary rounded-lg focus:border-primary outline-none transition-colors text-sm" />
                    </div>

                    <div className="p-5 border border-secondary rounded-2xl bg-secondary/5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold">Food Handler Certificate</h4>
                          <p className="text-xs text-foreground/50">Required for Kitchen Staff.</p>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-sm font-bold text-primary">I have this</span>
                          <input type="checkbox" className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary" />
                        </label>
                      </div>
                      <input type="text" placeholder="Enter Certificate Number (Optional)" className="w-full px-4 py-2.5 bg-background border border-secondary rounded-lg focus:border-primary outline-none transition-colors text-sm" />
                    </div>

                    <div className="p-5 border border-secondary rounded-2xl bg-amber-500/5 border-amber-500/20">
                      <h4 className="font-bold text-amber-500 flex items-center gap-2 mb-2">
                        Identity Verification
                      </h4>
                      <p className="text-sm text-foreground/70 mb-4">
                        You will be required to upload a Government ID through the portal once your account is created. You cannot accept shifts until your ID is verified by our admin team.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <button onClick={prevStep} className="px-8 py-4 border border-secondary rounded-xl font-bold flex items-center gap-2 hover:bg-secondary/50 transition-all">
                    Back
                  </button>
                  <button onClick={handleSubmit} disabled={isSubmitting} className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50">
                    {isSubmitting ? "Submitting Profile..." : "Submit Profile for Review"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 6: SUCCESS */}
            {step === TOTAL_STEPS + 1 && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-12">
                <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h1 className="text-4xl font-black mb-4">Application Received!</h1>
                <p className="text-lg text-foreground/70 mb-8 max-w-md mx-auto">
                  Welcome to Staff Tracker. Our administrative team will review your profile, resume, and certifications shortly. Look out for an SMS notification once approved.
                </p>
                <div className="p-6 border border-secondary rounded-2xl bg-secondary/10 w-full max-w-md text-left mb-8">
                  <h4 className="font-bold mb-2">Next Steps:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-foreground/70">
                    <li>Log in to your worker dashboard.</li>
                    <li>Upload a clear photo of your Government ID.</li>
                    <li>Upload photos of your selected certifications.</li>
                  </ol>
                </div>
                <Link href="/login/worker" className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                  Proceed to Login
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

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
