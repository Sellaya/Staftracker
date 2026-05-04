"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight, User, MapPin, Briefcase, FileCheck, Shield, UploadCloud, Link as LinkIcon, FileText } from "lucide-react";

type WorkerSignupData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  legalStatus: string;
  linkedin: string;
  postalCode: string;
  neighborhoods: string[];
  primaryRoles: string[];
  yearsExperience: string;
  bio: string;
  smartServeHas: boolean;
  smartServeNumber: string;
  foodHandlerHas: boolean;
  foodHandlerNumber: string;
};

const NEIGHBORHOODS = ["Downtown Core", "King West", "Queen West", "Yorkville", "The Danforth", "Liberty Village", "Midtown", "North York", "Etobicoke"];
const ROLES = ["Bartender", "Server", "Host / Hostess", "Line Cook", "Prep Cook", "Dishwasher", "Security", "Barback"];

export default function WorkerSignup() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  
  // File upload state
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [extraDocFileName, setExtraDocFileName] = useState<string | null>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const extraDocInputRef = useRef<HTMLInputElement>(null);

  const TOTAL_STEPS = 5;

  const [formData, setFormData] = useState<WorkerSignupData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    legalStatus: "",
    linkedin: "",
    postalCode: "",
    neighborhoods: [],
    primaryRoles: [],
    yearsExperience: "Less than 1 year",
    bio: "",
    smartServeHas: false,
    smartServeNumber: "",
    foodHandlerHas: false,
    foodHandlerNumber: "",
  });

  const updateFormData = <K extends keyof WorkerSignupData>(key: K, value: WorkerSignupData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (stepError) setStepError(null);
    if (submitError) setSubmitError(null);
  };

  const toggleArrayValue = (current: string[], value: string) =>
    current.includes(value) ? current.filter((v) => v !== value) : [...current, value];

  const validateCurrentStep = () => {
    if (step === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.password) {
        return "Please complete all account fields.";
      }
      if (formData.password.length < 8) return "Password must be at least 8 characters.";
    }
    if (step === 2 && !formData.legalStatus) return "Please select your legal status.";
    if (step === 3) {
      if (formData.postalCode.trim().length !== 3) return "Postal code must be the first 3 characters (e.g. M5V).";
      if (formData.neighborhoods.length === 0) return "Select at least one neighborhood.";
    }
    if (step === 4) {
      if (formData.primaryRoles.length === 0) return "Select at least one primary role.";
      if (!resumeFileName) return "Please upload your resume before continuing.";
    }
    return null;
  };

  const nextStep = () => {
    const error = validateCurrentStep();
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const prevStep = () => {
    setStepError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const finalStepError = validateCurrentStep();
    if (finalStepError) {
      setStepError(finalStepError);
      return;
    }

    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const password = formData.password;

    if (!firstName || !lastName || !email || !phone || !password) {
      setSubmitError("Please complete your basic account details before submitting.");
      return;
    }
    if (password.length < 8) {
      setSubmitError("Password must be at least 8 characters.");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/signup/worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          firstName,
          lastName,
          email,
          phone,
          resumeFileName,
          extraDocFileName,
        })
      });
      if (res.ok) {
        setStepError(null);
        setStep(TOTAL_STEPS + 1); // Success state
      } else {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error || "Failed to submit profile.");
      }
    } catch {
      setSubmitError("Unable to submit right now. Please try again.");
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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-medium text-sm">
            ST
          </div>
          <span className="font-medium tracking-tight text-foreground">Staff Tracker</span>
        </Link>
        {step <= TOTAL_STEPS && (
          <Link href="/" className="text-sm font-medium text-foreground/50 hover:text-foreground flex items-center gap-2">
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
                  <h1 className="text-3xl font-medium">Worker Registration</h1>
                  <span className="text-sm font-medium text-foreground/50">Step {step} of {TOTAL_STEPS}</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden flex">
                  <div className={`h-full bg-primary transition-all duration-500`} style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
                </div>
                
                <div className="flex justify-between mt-4 text-[10px] sm:text-xs font-medium text-foreground/40 hidden sm:flex">
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
                    <h2 className="text-xl font-medium">Basic Information</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-foreground/70 mb-1">FIRST NAME</label>
                        <input type="text" value={formData.firstName} onChange={e => updateFormData("firstName", e.target.value)} placeholder="John" className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-foreground/70 mb-1">LAST NAME</label>
                        <input type="text" value={formData.lastName} onChange={e => updateFormData("lastName", e.target.value)} placeholder="Doe" className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground/70 mb-1">EMAIL ADDRESS</label>
                      <input type="email" value={formData.email} onChange={e => updateFormData("email", e.target.value)} placeholder="john@example.com" className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground/70 mb-1">PHONE NUMBER</label>
                      <input type="tel" value={formData.phone} onChange={e => updateFormData("phone", e.target.value)} placeholder="(416) 555-0198" className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground/70 mb-1">PASSWORD</label>
                      <input type="password" value={formData.password} onChange={e => updateFormData("password", e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={nextStep} className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all">
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
                    <h2 className="text-xl font-medium">Legal Status & Social</h2>
                  </div>
                  <div className="space-y-6">
                    
                    <div>
                      <label className="block text-xs font-medium text-foreground/70 mb-1">LEGAL STATUS IN CANADA</label>
                      <select value={formData.legalStatus} onChange={(e) => updateFormData("legalStatus", e.target.value)} className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors appearance-none cursor-pointer">
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
                      <label className="block text-xs font-medium text-foreground/70 mb-1">LINKEDIN PROFILE (OPTIONAL)</label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                        <input type="url" value={formData.linkedin} onChange={(e) => updateFormData("linkedin", e.target.value)} placeholder="https://linkedin.com/in/username" className="w-full pl-10 pr-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors" />
                      </div>
                      <p className="text-xs text-foreground/50 mt-1">A LinkedIn profile can help speed up the verification process.</p>
                    </div>

                  </div>
                </div>
                <div className="flex justify-between">
                  <button onClick={prevStep} className="px-8 py-4 border border-secondary rounded-xl font-medium flex items-center gap-2 hover:bg-secondary/50 transition-all">
                    Back
                  </button>
                  <button onClick={nextStep} className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all">
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
                    <h2 className="text-xl font-medium">Toronto Logistics</h2>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-medium text-foreground/70 mb-1">HOME POSTAL CODE (FIRST 3 DIGITS)</label>
                      <input type="text" value={formData.postalCode} onChange={(e) => updateFormData("postalCode", e.target.value.toUpperCase())} placeholder="e.g. M5V" maxLength={3} className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors uppercase" />
                      <p className="text-xs text-foreground/50 mt-1">Used to calculate commute times and match you with nearby venues.</p>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-foreground/70 mb-2">NEIGHBORHOODS WILLING TO WORK IN</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {NEIGHBORHOODS.map(hood => (
                          <label key={hood} className="flex items-center gap-2 p-3 border border-secondary rounded-xl cursor-pointer hover:bg-secondary/20 transition-colors">
                            <input type="checkbox" checked={formData.neighborhoods.includes(hood)} onChange={() => updateFormData("neighborhoods", toggleArrayValue(formData.neighborhoods, hood))} className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary" />
                            <span className="text-sm font-medium">{hood}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <button onClick={prevStep} className="px-8 py-4 border border-secondary rounded-xl font-medium flex items-center gap-2 hover:bg-secondary/50 transition-all">
                    Back
                  </button>
                  <button onClick={nextStep} className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all">
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
                    <h2 className="text-xl font-medium">Experience & Resume</h2>
                  </div>
                  <div className="space-y-6">
                    
                    <div>
                      <label className="block text-xs font-medium text-foreground/70 mb-2">PRIMARY ROLES (SELECT ALL THAT APPLY)</label>
                      <div className="grid grid-cols-2 gap-3">
                        {ROLES.map(role => (
                          <label key={role} className="flex items-center gap-3 p-4 border border-secondary rounded-xl cursor-pointer hover:border-primary/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                            <input type="checkbox" checked={formData.primaryRoles.includes(role)} onChange={() => updateFormData("primaryRoles", toggleArrayValue(formData.primaryRoles, role))} className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary" />
                            <span className="font-medium">{role}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-foreground/70 mb-1">YEARS OF HOSPITALITY EXPERIENCE</label>
                      <select value={formData.yearsExperience} onChange={(e) => updateFormData("yearsExperience", e.target.value)} className="w-full px-4 py-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors appearance-none cursor-pointer">
                        <option>Less than 1 year</option>
                        <option>1 - 3 years</option>
                        <option>3 - 5 years</option>
                        <option>5+ years</option>
                      </select>
                    </div>

                    <div className="pt-4 border-t border-secondary/50">
                      <label className="block text-xs font-medium text-foreground/70 mb-2">UPLOAD RESUME (PDF OR DOCX)</label>
                      <input type="file" ref={resumeInputRef} className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => handleFileUpload(e, setResumeFileName)} />
                      <div 
                        onClick={() => resumeInputRef.current?.click()}
                        className={`w-full p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${resumeFileName ? 'border-primary bg-primary/5' : 'border-secondary hover:bg-secondary/10'}`}
                      >
                        {resumeFileName ? (
                          <>
                            <FileText className="w-8 h-8 text-primary mb-2" />
                            <span className="font-medium text-primary">{resumeFileName}</span>
                            <span className="text-xs text-foreground/50 mt-1">Click to replace file</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-8 h-8 text-foreground/40 mb-2" />
                            <span className="font-medium text-foreground/70">Click to browse or drag and drop</span>
                            <span className="text-xs text-foreground/50 mt-1">Maximum file size: 5MB</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-foreground/70 mb-2">ANY OTHER DOCUMENTS OR BIO INFO? (OPTIONAL)</label>
                      <input type="file" ref={extraDocInputRef} className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={(e) => handleFileUpload(e, setExtraDocFileName)} />
                      {extraDocFileName ? (
                        <div className="flex justify-between items-center p-3 border border-secondary rounded-xl bg-secondary/10">
                          <span className="text-sm font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-primary"/> {extraDocFileName}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (!confirm("Remove this uploaded document?")) return;
                              setExtraDocFileName(null);
                            }}
                            className="text-xs text-red-500 font-medium hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => extraDocInputRef.current?.click()} className="w-full px-4 py-3 border border-secondary rounded-xl text-sm font-medium text-foreground/70 hover:bg-secondary/10 transition-colors flex items-center justify-center gap-2">
                          <UploadCloud className="w-4 h-4" /> Upload Additional Document
                        </button>
                      )}
                      <textarea value={formData.bio} onChange={(e) => updateFormData("bio", e.target.value)} placeholder="Tell us a bit about yourself or add links to your portfolio..." className="w-full h-24 mt-3 p-3 bg-background border border-secondary rounded-xl focus:border-primary outline-none transition-colors resize-none text-sm" />
                    </div>

                  </div>
                </div>
                <div className="flex justify-between">
                  <button onClick={prevStep} className="px-8 py-4 border border-secondary rounded-xl font-medium flex items-center gap-2 hover:bg-secondary/50 transition-all">
                    Back
                  </button>
                  <button onClick={nextStep} className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all">
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
                    <h2 className="text-xl font-medium">Ontario Certifications</h2>
                  </div>
                  <div className="space-y-6">
                    <div className="p-5 border border-secondary rounded-2xl bg-secondary/5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-medium">SmartServe Certification</h4>
                          <p className="text-xs text-foreground/50">Required for Bartenders and Servers in Ontario.</p>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-sm font-medium text-primary">I have this</span>
                          <input type="checkbox" checked={formData.smartServeHas} onChange={(e) => updateFormData("smartServeHas", e.target.checked)} className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary" />
                        </label>
                      </div>
                      <input type="text" value={formData.smartServeNumber} onChange={(e) => updateFormData("smartServeNumber", e.target.value)} placeholder="Enter Registration Number (Optional)" className="w-full px-4 py-2.5 bg-background border border-secondary rounded-lg focus:border-primary outline-none transition-colors text-sm" />
                    </div>

                    <div className="p-5 border border-secondary rounded-2xl bg-secondary/5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-medium">Food Handler Certificate</h4>
                          <p className="text-xs text-foreground/50">Required for Kitchen Staff.</p>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-sm font-medium text-primary">I have this</span>
                          <input type="checkbox" checked={formData.foodHandlerHas} onChange={(e) => updateFormData("foodHandlerHas", e.target.checked)} className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary" />
                        </label>
                      </div>
                      <input type="text" value={formData.foodHandlerNumber} onChange={(e) => updateFormData("foodHandlerNumber", e.target.value)} placeholder="Enter Certificate Number (Optional)" className="w-full px-4 py-2.5 bg-background border border-secondary rounded-lg focus:border-primary outline-none transition-colors text-sm" />
                    </div>

                    <div className="p-5 border border-secondary rounded-2xl bg-amber-500/5 border-amber-500/20">
                      <h4 className="font-medium text-amber-500 flex items-center gap-2 mb-2">
                        Identity Verification
                      </h4>
                      <p className="text-sm text-foreground/70 mb-4">
                        You will be required to upload a Government ID through the portal once your account is created. You cannot accept shifts until your ID is verified by our admin team.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <button onClick={prevStep} className="px-8 py-4 border border-secondary rounded-xl font-medium flex items-center gap-2 hover:bg-secondary/50 transition-all">
                    Back
                  </button>
                  <button onClick={handleSubmit} disabled={isSubmitting} className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50">
                    {isSubmitting ? "Submitting Profile..." : "Submit Profile for Review"}
                  </button>
                </div>
                {submitError && (
                  <div className="p-4 border border-red-500/30 bg-red-500/10 text-red-500 rounded-xl text-sm font-medium">
                    {submitError}
                  </div>
                )}
                {stepError && (
                  <div className="p-4 border border-amber-500/30 bg-amber-500/10 text-amber-500 rounded-xl text-sm font-medium">
                    {stepError}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 6: SUCCESS */}
            {step === TOTAL_STEPS + 1 && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-12">
                <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h1 className="text-4xl font-medium mb-4">Application Received!</h1>
                <p className="text-lg text-foreground/70 mb-8 max-w-md mx-auto">
                  Welcome to Staff Tracker. Our administrative team will review your profile, resume, and certifications shortly. Look out for an SMS notification once approved.
                </p>
                <div className="p-6 border border-secondary rounded-2xl bg-secondary/10 w-full max-w-md text-left mb-8">
                  <h4 className="font-medium mb-2">Next Steps:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-foreground/70">
                    <li>Log in to your worker dashboard.</li>
                    <li>Upload a clear photo of your Government ID.</li>
                    <li>Upload photos of your selected certifications.</li>
                  </ol>
                </div>
                <Link href="/login/worker" className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                  Proceed to Login
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
          {step <= TOTAL_STEPS && stepError && (
            <div className="mt-4 p-4 border border-amber-500/30 bg-amber-500/10 text-amber-500 rounded-xl text-sm font-medium">
              {stepError}
            </div>
          )}
          {step <= TOTAL_STEPS && submitError && (
            <div className="mt-4 p-4 border border-red-500/30 bg-red-500/10 text-red-500 rounded-xl text-sm font-medium">
              {submitError}
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center border-t border-secondary/30 mt-auto">
        <p className="text-xs font-medium text-foreground/40 tracking-widest uppercase">
          Powered by <span className="text-foreground/80">Ferrari</span>
        </p>
      </footer>
    </div>
  );
}
