"use client";

import { 
  LayoutDashboard, Users, Settings, LogOut, Bell, 
  Building2, CalendarDays, FileCheck2, MapPin,
  AlertTriangle, BarChart3, BrainCircuit, Briefcase 
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Jobs", href: "/dashboard/jobs", icon: Briefcase },
    { name: "Workers", href: "/dashboard/workers", icon: Users },
    { name: "Clients", href: "/dashboard/clients", icon: Building2 },
    { name: "Venues", href: "/dashboard/venues", icon: MapPin },
    { name: "Shifts", href: "/dashboard/shifts", icon: CalendarDays },
    { name: "Documents", href: "/dashboard/documents", icon: FileCheck2 },
    { name: "Disputes", href: "/dashboard/disputes", icon: AlertTriangle },
    { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    { name: "AI Matchmaking", href: "/dashboard/ai", icon: BrainCircuit },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r glass hidden md:flex flex-col">
        <div className="h-20 flex items-center px-6 border-b border-secondary/50">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              P
            </div>
            <span className="font-bold text-xl tracking-tight">PoweredByFerrari</span>
          </Link>
        </div>

        <div className="flex-1 py-6 px-4 space-y-2">
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
          <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-foreground/70 hover:bg-secondary/50 hover:text-foreground transition-all font-medium">
            <LogOut className="w-5 h-5" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 border-b glass flex items-center justify-between px-8 z-10">
          <h2 className="text-xl font-bold">Dashboard</h2>
          
          <div className="flex items-center gap-6">
            <button className="relative text-foreground/70 hover:text-foreground transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-accent rounded-full border-2 border-background" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent p-0.5">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center border-2 border-background">
                <span className="font-bold text-sm">US</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8 bg-secondary/5">
          {children}
        </div>
      </main>
    </div>
  );
}
