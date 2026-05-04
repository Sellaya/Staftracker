"use client";

import {
  CalendarDays, DollarSign, User, LogOut, Bell, Search
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const navigation = [
    { name: "My Dashboard", href: "/worker/dashboard", icon: CalendarDays },
    { name: "Browse Shifts", href: "/worker/shifts", icon: Search },
    { name: "Earnings", href: "/worker/earnings", icon: DollarSign },
    { name: "My Profile", href: "/worker/profile", icon: User },
  ];

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    localStorage.removeItem("user");
    router.push("/login/worker");
  };

  return (
    <div className="min-h-screen bg-background flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r glass hidden md:flex flex-col z-20">
        <div className="h-20 flex items-center px-6 border-b border-secondary/50">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-black text-sm shadow-lg shadow-primary/20">
              ST
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground">Worker Portal</span>
          </Link>
        </div>

        <div className="flex-1 py-8 px-4 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-foreground/70 hover:bg-secondary/50 hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-secondary/50">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-500 hover:bg-red-500/10 transition-all font-bold"
          >
            <LogOut className="w-5 h-5" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-secondary/50 bg-background/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-sm">
              ST
            </div>
            <span className="font-bold">Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <Bell className="w-5 h-5" />
            <button type="button" onClick={handleLogout} className="text-red-500"><LogOut className="w-5 h-5" /></button>
          </div>
        </header>

        {/* Top Header (Desktop) */}
        <header className="hidden md:flex h-20 border-b glass items-center justify-between px-8 z-10">
          <h2 className="text-xl font-bold">
            {navigation.find(n => n.href === pathname)?.name || "Dashboard"}
          </h2>
          <div className="flex items-center gap-6">
            <button className="relative text-foreground/70 hover:text-foreground transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background" />
            </button>
            <div className="flex items-center gap-4 border-l border-secondary pl-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary border border-primary/20">
                JD
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-red-500 hover:text-red-600 transition-colors flex items-center gap-2 text-sm font-bold"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-secondary/5">
          {children}
        </div>
      </main>
    </div>
  );
}
