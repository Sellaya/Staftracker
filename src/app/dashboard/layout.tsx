"use client";

import {
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  MapPin,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type NavItem = { name: string; href: string; icon: any; adminOnly?: boolean; accent: string };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

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
        if (sessionUser.role === "user") {
          const allowed = new Set(["/dashboard", "/dashboard/jobs", "/dashboard/venues", "/dashboard/shifts"]);
          if (!allowed.has(pathname)) router.push("/dashboard/jobs");
        }
      } catch {
        router.push("/");
      }
    };
    bootstrap();
  }, [router, pathname]);

  const handleLogout = async () => {
    const role = user?.role;
    await fetch("/api/logout", { method: "POST" });
    localStorage.removeItem("user");
    router.push(role === "user" ? "/login/client" : "/login/admin");
  };

  const navigation = useMemo(() => {
    const baseNavigation: NavItem[] = [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard, accent: "#579bfc" },
      { name: "Jobs", href: "/dashboard/jobs", icon: Briefcase, accent: "#00c875" },
      { name: "Clients", href: "/dashboard/clients", icon: Building2, accent: "#a25ddc" },
      { name: "Venues", href: "/dashboard/venues", icon: MapPin, accent: "#ffcb00" },
      { name: "Shifts", href: "/dashboard/shifts", icon: CalendarDays, accent: "#ff642e" },
      { name: "Workers", href: "/dashboard/workers", icon: Users, accent: "#66ccff" },
      { name: "Documents", href: "/dashboard/documents", icon: FileCheck2, accent: "#e2445c" },
      { name: "Settings", href: "/dashboard/settings", icon: Settings, adminOnly: true, accent: "#c4c9d4" },
    ];
    const clientNavigation: NavItem[] = [
      { name: "Workspace", href: "/dashboard", icon: LayoutDashboard, accent: "#579bfc" },
      { name: "Jobs", href: "/dashboard/jobs", icon: Briefcase, accent: "#00c875" },
      { name: "Venues", href: "/dashboard/venues", icon: MapPin, accent: "#ffcb00" },
      { name: "Shifts", href: "/dashboard/shifts", icon: CalendarDays, accent: "#ff642e" },
    ];
    const items = user?.role === "user" ? clientNavigation : baseNavigation;
    return items.filter((item) => !item.adminOnly || user?.role === "admin" || user?.role === "super_admin");
  }, [user?.role]);

  if (!user) return null;

  const initials =
    user.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "AD";
  const activeSection = navigation.find((item) => pathname === item.href)?.name || "Workspace";
  const mobilePrimaryAction =
    pathname === "/dashboard/documents"
      ? { label: "Review docs", href: "/dashboard/documents" }
      : pathname === "/dashboard/shifts"
        ? { label: "Review shifts", href: "/dashboard/shifts" }
        : { label: "New job", href: "/dashboard/jobs" };

  return (
    <div className="min-h-screen bg-background text-foreground flex mobile-safe-bottom md:pb-0">
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
        <div className="p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg bg-white/8 px-2.5 py-2.5 hover:bg-white/12"
          >
            <div className="h-8 w-8 rounded-lg bg-white text-[#1f2a44] flex items-center justify-center text-sm font-black">
              ST
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black leading-tight">Staff Tracker</p>
              <p className="truncate text-xs text-white/55">Hospitality OS</p>
            </div>
          </Link>
        </div>

        <div className="px-3 pb-2">
          <div className="rounded-lg border border-white/10 bg-white/7 p-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-white/45">Workspace</p>
                <p className="text-sm font-bold">Toronto Ops</p>
              </div>
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_0_4px_rgba(0,200,117,0.14)]" />
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-2">
          <p className="px-2.5 pb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Boards</p>
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-bold ${
                    isActive ? "bg-white text-[#172033]" : "text-white/72 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span
                    className="h-5 w-1 rounded-full"
                    style={{ backgroundColor: item.accent, opacity: isActive ? 1 : 0.55 }}
                  />
                  <item.icon className="h-[18px] w-[18px]" />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-3">
          <div className="mb-2 rounded-lg border border-white/10 bg-white/7 p-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-white/65">
              <Sparkles className="h-4 w-4 text-[var(--warning)]" />
              MVP workspace ready
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-bold text-white/72 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-card/86 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between gap-3 px-3 md:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground md:text-xs">Workspace</p>
              <h2 className="truncate text-lg font-black tracking-tight md:text-xl">{activeSection}</h2>
            </div>

            <div className="hidden min-w-[320px] max-w-xl flex-1 items-center rounded-lg border border-border bg-muted px-3 py-1.5 lg:flex">
              <Search className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Search jobs, workers, venues, shifts</span>
              <span className="ml-auto rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-black text-muted-foreground">/</span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={mobilePrimaryAction.href}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-black text-white md:hidden"
              >
                <Plus className="h-4 w-4" />
                {mobilePrimaryAction.label}
              </Link>
              <button
                type="button"
                className="relative hidden h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground sm:flex"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-[var(--danger)] ring-2 ring-card" />
              </button>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-black leading-none">{user.name}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-primary">{user.role.replace("_", " ")}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-black text-white">
                {initials}
              </div>
            </div>
          </div>
          <div className="border-t border-border/70 px-3 py-2 md:hidden">
            <div className="mb-2 flex items-center rounded-lg border border-border bg-muted px-3 py-1.5">
              <Search className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-bold text-muted-foreground">Search workspace</span>
            </div>
            <div className="mobile-command-scroll flex gap-2 overflow-x-auto">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-black ${
                      isActive ? "border-primary bg-primary text-white" : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.accent }} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto px-3 py-3 md:px-6 md:py-5">
          {children}
        </div>
      </main>

      <nav className="mobile-bottom-nav fixed inset-x-3 z-30 grid grid-cols-4 gap-1 rounded-xl border border-border bg-card/95 p-1 shadow-lg backdrop-blur-xl md:hidden">
        {navigation.slice(0, 4).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-black ${
                isActive ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="max-w-full truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
