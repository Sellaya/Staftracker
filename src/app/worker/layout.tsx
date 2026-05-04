"use client";

import { Bell, CalendarDays, DollarSign, LogOut, Search, User, WalletCards } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const navigation = [
    { name: "Today", href: "/worker/dashboard", icon: CalendarDays, accent: "#579bfc" },
    { name: "Browse", href: "/worker/shifts", icon: Search, accent: "#00c875" },
    { name: "Earnings", href: "/worker/earnings", icon: DollarSign, accent: "#ffcb00" },
    { name: "Profile", href: "/worker/profile", icon: User, accent: "#a25ddc" },
  ];

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    localStorage.removeItem("user");
    router.push("/login/worker");
  };

  const activeSection = navigation.find((item) => item.href === pathname)?.name || "Worker Portal";

  return (
    <div className="min-h-screen bg-background text-foreground mobile-safe-bottom md:flex md:pb-0">
      <aside className="hidden w-60 shrink-0 flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] md:flex">
        <div className="p-3">
          <Link href="/worker/dashboard" className="flex items-center gap-2 rounded-lg bg-white/8 px-2.5 py-2.5 hover:bg-white/12">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm text-[#1f2a44] font-black">ST</div>
            <div>
              <p className="text-sm font-black leading-tight">Worker Portal</p>
              <p className="text-xs text-white/55">Shift workspace</p>
            </div>
          </Link>
        </div>

        <div className="px-3 pb-3">
          <div className="rounded-lg border border-white/10 bg-white/7 p-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-black text-white">
                JD
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">Ready for shifts</p>
                <p className="truncate text-xs text-white/55">Verification workspace</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2.5">
          <p className="px-2.5 pb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">My boards</p>
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-bold ${
                    isActive ? "bg-white text-[#172033]" : "text-white/72 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="h-5 w-1 rounded-full" style={{ backgroundColor: item.accent, opacity: isActive ? 1 : 0.55 }} />
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-bold text-white/72 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-card/86 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between gap-3 px-3 md:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground md:text-xs">Worker workspace</p>
              <h2 className="truncate text-lg font-black tracking-tight md:text-xl">{activeSection}</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center rounded-lg border border-border bg-muted px-3 py-1.5 text-sm font-bold text-muted-foreground sm:flex">
                <WalletCards className="mr-2 h-4 w-4 text-[var(--accent)]" />
                Gross pay tracker
              </div>
              <Link
                href="/worker/shifts"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-black text-white md:hidden"
              >
                <Search className="h-4 w-4" />
                Find shifts
              </Link>
              <button
                type="button"
                className="relative hidden h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground sm:flex"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-[var(--accent)] ring-2 ring-card" />
              </button>
              <button type="button" onClick={handleLogout} className="md:hidden rounded-lg border border-border bg-card p-1.5 text-[var(--danger)]">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="border-t border-border/70 px-3 py-2 md:hidden">
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
        {navigation.map((item) => {
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
