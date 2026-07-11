"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Camera,
  LayoutTemplate,
  Printer,
  History,
  MonitorSmartphone,
  BarChart3,
  Users,
  LogOut,
  Menu,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { ThemeToggle } from "@selfie-booth/ui";
import { authClient } from "@selfie-booth/auth/client";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/booths", label: "Booths", icon: Camera },
  { href: "/admin/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/admin/printers", label: "Printers", icon: Printer },
  { href: "/admin/print-history", label: "Print history", icon: History },
  { href: "/admin/devices", label: "Devices", icon: MonitorSmartphone },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings/members", label: "Members", icon: Users },
] as const;

export function AdminShell({ orgName, userName, children }: { orgName: string; userName: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const signOut = async () => {
    await authClient.signOut();
    router.push("/sign-in");
  };

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 p-3">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileNavOpen(false)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 flex-col border-r border-slate-200 dark:border-slate-800 md:flex">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Camera className="h-4 w-4" />
          </div>
          <span className="truncate text-sm font-semibold">{orgName}</span>
        </div>
        {nav}
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="truncate text-xs text-slate-500 dark:text-slate-400">{userName}</span>
            <ThemeToggle />
          </div>
          <button
            onClick={signOut}
            className="mt-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative flex w-60 flex-col bg-white dark:bg-slate-900">{nav}</aside>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 md:hidden">
          <button onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold">{orgName}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
