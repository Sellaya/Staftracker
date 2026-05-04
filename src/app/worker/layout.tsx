"use client";

import { Briefcase, DollarSign, LayoutDashboard, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { WorkspaceShell, type ShellNavItem } from "@/components/layout/workspace-shell";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "user" | "worker";
};

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) {
          router.push("/login/worker");
          return;
        }
        const sessionUser = await res.json();
        if (sessionUser.role !== "worker") {
          if (sessionUser.role === "user") router.push("/dashboard");
          else if (sessionUser.role === "admin" || sessionUser.role === "super_admin") router.push("/dashboard");
          else router.push("/");
          return;
        }
        localStorage.setItem("user", JSON.stringify(sessionUser));
        setUser(sessionUser);
      } catch {
        router.push("/login/worker");
      }
    };
    bootstrap();
  }, [router]);

  const navigation: ShellNavItem[] = [
    { name: "Dashboard", href: "/worker/dashboard", icon: LayoutDashboard, accent: "#2563EB" },
    { name: "Shifts", href: "/worker/shifts", icon: Briefcase, accent: "#16A34A" },
    { name: "Profile", href: "/worker/profile", icon: User, accent: "#7C3AED" },
    { name: "Earnings", href: "/worker/earnings", icon: DollarSign, accent: "#F59E0B" },
  ];

  if (!user) return null;

  return (
    <WorkspaceShell
      user={user}
      navigation={navigation}
      subtitle="Worker workspace"
      brandLabel="Worker Portal"
      brandSubtle="Hospitality shifts"
      workspaceLabel="Toronto"
      workspaceSubtle="Marketplace"
      logoutTo="/login/worker"
      primaryAction={{ label: "Open jobs", href: "/worker/shifts", icon: Briefcase }}
    >
      {children}
    </WorkspaceShell>
  );
}
