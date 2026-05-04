"use client";

import type { LucideIcon } from "lucide-react";
import { Bell, LogOut, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ProfileIdentityCard } from "@/components/ui/profile-identity-card";
import { cn } from "@/components/ui/workspace";
import { RoleBadge } from "@/components/ui/status-badge";

export type ShellNavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  accent?: string;
};

export function WorkspaceShell({
  children,
  user,
  navigation,
  title,
  subtitle,
  brandLabel,
  brandSubtle,
  workspaceLabel,
  workspaceSubtle,
  logoutTo,
  primaryAction,
  utility,
}: {
  children: ReactNode;
  user?: { name?: string; email?: string; role?: string } | null;
  navigation: ShellNavItem[];
  title?: string;
  subtitle: string;
  brandLabel: string;
  brandSubtle: string;
  workspaceLabel: string;
  workspaceSubtle: string;
  logoutTo: string;
  primaryAction?: { label: string; href: string; icon?: LucideIcon };
  utility?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active = navigation.find((item) => pathname === item.href) || navigation.find((item) => pathname.startsWith(item.href) && item.href !== "/dashboard");
  const activeSection = title || active?.name || "Workspace";
  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "ST";

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    localStorage.removeItem("user");
    router.push(logoutTo);
  };

  const ActionIcon = primaryAction?.icon || Plus;

  return (
    <div className="min-h-screen bg-background text-foreground mobile-safe-bottom md:flex md:pb-0">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] md:flex">
        <div className="p-3">
          <Link href={navigation[0]?.href || "/"} className="flex items-center gap-2 rounded-lg bg-white/[0.08] px-2.5 py-2.5 hover:bg-white/[0.12]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-medium text-[#111827]">ST</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-tight">{brandLabel}</p>
              <p className="truncate text-xs text-white/55">{brandSubtle}</p>
            </div>
          </Link>
        </div>

        <div className="px-3 pb-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.07] p-2.5 shadow-inner shadow-white/5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/50">{workspaceSubtle}</p>
                <p className="truncate text-sm font-medium text-white/95">{workspaceLabel}</p>
              </div>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent)] shadow-[0_0_0_4px_rgba(22,163,74,0.14)]" />
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-2">
          <p className="px-2.5 pb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">Workspace</p>
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium",
                    isActive ? "bg-white text-[#111827]" : "text-white/72 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <span className="h-5 w-1 rounded-full" style={{ backgroundColor: item.accent || "#2563eb", opacity: isActive ? 1 : 0.58 }} />
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="space-y-2 p-3">
          {user && (
            <ProfileIdentityCard
              variant="sidebar"
              name={user.name || "Account"}
              email={user.email}
              subtitle={(user.role || "").replace("_", " ")}
              initials={initials}
            />
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between gap-3 px-3 md:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:text-[11px]">{subtitle}</p>
              <h2 className="truncate text-lg font-medium tracking-tight text-foreground md:text-xl">{activeSection}</h2>
            </div>

            <div className="command-surface hidden min-w-[320px] max-w-xl flex-1 items-center px-3 py-1.5 lg:flex">
              <Search className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Search workspace records</span>
              <span className="ml-auto rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Cmd K</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {primaryAction && (
                <Link href={primaryAction.href} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white">
                  <ActionIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{primaryAction.label}</span>
                </Link>
              )}
              {utility}
              <button
                type="button"
                className="hidden h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground sm:flex"
                aria-label="Notifications (coming soon)"
                title="No notification feed in MVP"
              >
                <Bell className="h-5 w-5" />
              </button>
              {user && (
                <div className="hidden items-center gap-2 sm:flex">
                  <div className="hidden lg:block">
                    <RoleBadge role={user.role} />
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#111827] text-sm font-medium text-white">
                    {initials}
                  </div>
                </div>
              )}
              <button type="button" onClick={handleLogout} className="rounded-lg border border-border bg-card p-1.5 text-[var(--danger)] md:hidden">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="border-t border-border/70 px-3 py-2 md:hidden">
            <div className="mobile-command-scroll flex gap-2 overflow-x-auto">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-medium",
                      isActive ? "border-primary bg-primary text-white" : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto px-3 py-3 md:px-6 md:py-5">{children}</div>
      </main>

      <nav className="mobile-bottom-nav fixed inset-x-3 z-30 grid grid-cols-4 gap-1 rounded-xl border border-border bg-card/95 p-1 shadow-lg backdrop-blur-xl md:hidden">
        {navigation.slice(0, 4).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium",
                isActive ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="max-w-full truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

