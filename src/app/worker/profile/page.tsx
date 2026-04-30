"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, ShieldCheck, FileText, UploadCloud, AlertCircle } from "lucide-react";

export default function WorkerProfile() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUserStr = localStorage.getItem("currentUser");
    if (currentUserStr) {
      setUser(JSON.parse(currentUserStr));
    }
  }, []);

  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setUploadSuccess(true);
    }, 2000);
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-foreground/70 mt-1">Manage your personal information and legal documents.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Personal Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="p-6 rounded-3xl border border-secondary bg-background/50 glass flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-3xl mb-4 border border-primary/20">
              {user ? `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}` : "JD"}
            </div>
            <h2 className="text-xl font-bold">{user ? `${user.firstName} ${user.lastName}` : "John Doe"}</h2>
            <p className="text-sm text-foreground/50 font-mono mb-4">ID: {user ? user.id : "W-1005"}</p>
            
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" /> Account Active
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-secondary bg-background/50 glass space-y-4">
            <div>
              <label className="text-xs font-bold text-foreground/50">EMAIL</label>
              <p className="font-medium">john.doe@example.com</p>
            </div>
            <div>
              <label className="text-xs font-bold text-foreground/50">PHONE</label>
              <p className="font-medium">+1 (555) 123-4567</p>
            </div>
            <div>
              <label className="text-xs font-bold text-foreground/50">ADDRESS</label>
              <p className="font-medium">123 King St W, Toronto, ON</p>
            </div>
            <div>
              <label className="text-xs font-bold text-foreground/50">LEGAL STATUS</label>
              <p className="font-medium">Canadian Citizen</p>
            </div>
            <button className="w-full mt-2 py-2 border border-secondary rounded-lg text-sm font-bold hover:bg-secondary/50 transition-colors">
              Edit Details
            </button>
          </div>
        </div>

        {/* Documents & Settings */}
        <div className="md:col-span-2 space-y-6">
          
          <div className="p-6 rounded-3xl border border-amber-500/30 bg-amber-500/5">
            <h3 className="text-lg font-bold text-amber-500 flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5" /> Action Required: SmartServe Expiring
            </h3>
            <p className="text-sm text-foreground/70 mb-4">
              Your SmartServe certification will expire on Nov 28, 2026. You must upload a renewed certificate to maintain eligibility for alcohol-service shifts.
            </p>
            
            <div className="border-2 border-dashed border-amber-500/30 rounded-xl p-6 text-center hover:bg-amber-500/10 transition-colors cursor-pointer group">
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6 text-amber-500" />
              </div>
              <p className="font-bold text-amber-500">Upload Renewed SmartServe</p>
              <p className="text-xs text-amber-500/70 mt-1">PDF, JPG, or PNG (Max 5MB)</p>
            </div>
            {uploadSuccess ? (
              <div className="mt-4 w-full py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-xl font-bold flex items-center justify-center gap-2">
                <ShieldCheck className="w-5 h-5" /> Document Pending Review
              </div>
            ) : isUploading ? (
              <button disabled className="mt-4 w-full py-3 bg-amber-500/50 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                Uploading...
              </button>
            ) : (
              <button onClick={handleUpload} className="mt-4 w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20">
                Submit Document
              </button>
            )}
          </div>

          <div className="p-6 rounded-3xl border border-secondary bg-background/50 glass">
            <h3 className="text-lg font-bold mb-4">My Documents</h3>
            <div className="space-y-4">
              
              <div className="flex items-center justify-between p-4 border border-secondary rounded-xl bg-secondary/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold">Food Handler Certification</p>
                    <p className="text-xs text-foreground/50">Approved on Jan 12, 2026</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-xs font-bold border border-emerald-500/20">
                  Valid
                </span>
              </div>

              <div className="flex items-center justify-between p-4 border border-secondary rounded-xl bg-secondary/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold">Government ID (Driver's License)</p>
                    <p className="text-xs text-foreground/50">Approved on Jan 12, 2026</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-xs font-bold border border-emerald-500/20">
                  Valid
                </span>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
