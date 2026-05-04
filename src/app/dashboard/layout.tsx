"use client";

import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  FileCheck2,
  LayoutDashboard,
  MapPin,
  Plus,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { WorkspaceShell, type ShellNavItem } from "@/components/layout/workspace-shell";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "user" | "worker";
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) {
          localStorage.removeItem("user");
          router.push("/");
          return;
        }
        const sessionUser = await res.json();
        localStorage.setItem("user", JSON.stringify(sessionUser));
        setUser(sessionUser);
        if (sessionUser.role === "worker") {
          router.push("/worker/dashboard");
          return;
        }
        if (sessionUser.role === "user") {
          const allowed = new Set([
            "/dashboard",
            "/dashboard/jobs",
            "/dashboard/venues",
            "/dashboard/shifts",
            "/dashboard/invoices",
          ]);
          if (!allowed.has(pathname)) router.push("/dashboard/jobs");
        }
      } catch {
        router.push("/");
      }
    };
    bootstrap();
  }, [router, pathname]);

  const navigation = useMemo<ShellNavItem[]>(() => {
    const adminNavigation: ShellNavItem[] = [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard, accent: "#2563EB" },
      { name: "Jobs", href: "/dashboard/jobs", icon: Briefcase, accent: "#16A34A" },
      { name: "Shifts", href: "/dashboard/shifts", icon: CalendarDays, accent: "#0284C7" },
      { name: "Workers", href: "/dashboard/workers", icon: Users, accent: "#7C3AED" },
      { name: "Documents", href: "/dashboard/documents", icon: FileCheck2, accent: "#F59E0B" },
      { name: "Clients", href: "/dashboard/clients", icon: Building2, accent: "#0284C7" },
      { name: "Venues", href: "/dashboard/venues", icon: MapPin, accent: "#16A34A" },
      { name: "Invoices", href: "/dashboard/invoices", icon: ReceiptText, accent: "#F59E0B" },
      { name: "Reports", href: "/dashboard/reports", icon: BarChart3, accent: "#2563EB" },
      { name: "AI", href: "/dashboard/ai", icon: Sparkles, accent: "#7C3AED" },
      { name: "Audit Logs", href: "/dashboard/audit", icon: ShieldCheck, accent: "#DC2626" },
      { name: "Settings", href: "/dashboard/settings", icon: Settings, accent: "#6B7280" },
    ];

    const clientNavigation: ShellNavItem[] = [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard, accent: "#2563EB" },
      { name: "Jobs", href: "/dashboard/jobs", icon: Briefcase, accent: "#16A34A" },
      { name: "Venues", href: "/dashboard/venues", icon: MapPin, accent: "#16A34A" },
      { name: "Shifts", href: "/dashboard/shifts", icon: CalendarDays, accent: "#0284C7" },
      { name: "Invoices", href: "/dashboard/invoices", icon: ReceiptText, accent: "#F59E0B" },
    ];

    return user?.role === "user" ? clientNavigation : adminNavigation;
  }, [user?.role]);

  if (!user) return null;

  const primaryAction =
    pathname === "/dashboard/venues"
      ? { label: "New venue", href: "/dashboard/venues", icon: Plus }
      : pathname === "/dashboard/invoices"
        ? { label: "Invoice", href: "/dashboard/invoices", icon: ReceiptText }
        : { label: "New job", href: "/dashboard/jobs", icon: Plus };

  return (
    <WorkspaceShell
      user={user}
      navigation={navigation}
      subtitle={user.role === "user" ? "Client workspace" : "Admin operations"}
      brandLabel="Staff Tracker"
      brandSubtle="Hospitality OS"
      workspaceLabel={user.role === "user" ? "Client account" : "Toronto Ops"}
      workspaceSubtle="Workspace"
      logoutTo={user.role === "user" ? "/login/client" : "/login/admin"}
      primaryAction={primaryAction}
    >
      {children}
    </WorkspaceShell>
  );
}
