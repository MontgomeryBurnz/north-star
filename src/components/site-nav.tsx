"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, ChevronDown, LogOut, Menu, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedNorthStarMark } from "@/components/login-brand-mark";
import { useCurrentUserAssignments } from "@/hooks/use-current-user-assignments";
import type { AppUserType } from "@/lib/admin-user-types";
import { cn } from "@/lib/utils";

type NavItem = {
  activePaths?: string[];
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { label: "Console", href: "/" },
  { label: "Programs", href: "/active-program", activePaths: ["/active-program", "/new-program"] },
  { label: "Guided Plans", href: "/systems" },
  { label: "Artifacts", href: "/artifacts" },
  { label: "Client Portal", href: "/client" },
  { label: "Admin", href: "/admin" },
  { label: "Leadership", href: "/leadership" }
];

const userTypeLabels: Record<AppUserType, string> = {
  admin: "Admin",
  leadership: "Leadership",
  "delivery-lead": "Delivery Lead",
  "team-member": "Team Member",
  client: "Client",
  viewer: "Viewer"
};

function LogoutForm({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <form action="/api/auth/user/logout" method="post" className={className}>
      <Button
        type="submit"
        variant={compact ? "ghost" : "outline"}
        size="sm"
        className={cn("w-full justify-start text-zinc-300 hover:text-zinc-50", !compact && "border-white/10 bg-white/[0.035]")}
      >
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </form>
  );
}

function CurrentUserMenu({ className, mobile = false }: { className?: string; mobile?: boolean }) {
  const pathname = usePathname();
  const { currentUser, loaded, primaryAssignment } = useCurrentUserAssignments();
  const [open, setOpen] = useState(false);
  const roleLabel = currentUser ? userTypeLabels[currentUser.userType] : "North Star access";
  const displayName = currentUser?.name || (loaded ? "Signed in" : "Loading user");
  const detail = currentUser?.email ?? primaryAssignment?.programName ?? "Authenticated workspace session";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Current user menu"
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-left transition-colors hover:bg-white/[0.055]",
          mobile ? "w-full" : "max-w-56"
        )}
        data-current-user-menu
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-emerald-300/20 bg-emerald-300/10">
          <UserRound className="h-4 w-4 text-emerald-200" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-zinc-50">{displayName}</span>
          <span className="block truncate text-[11px] uppercase tracking-[0.14em] text-emerald-200">{roleLabel}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-zinc-500 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          className={cn(
            "z-50 mt-2 rounded-md border border-white/10 bg-zinc-950 p-3 shadow-2xl shadow-black/40",
            mobile ? "w-full" : "absolute right-0 w-72"
          )}
        >
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <p className="truncate text-sm font-medium text-zinc-50">{displayName}</p>
            <p className="mt-1 truncate text-xs text-zinc-500">{detail}</p>
            <p className="mt-3 inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-100">
              {roleLabel}
            </p>
          </div>
          <LogoutForm compact className="mt-2" />
        </div>
      ) : null}
    </div>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="relative block h-12 w-12 shrink-0">
              <AnimatedNorthStarMark variant="nav" className="h-12 w-12" />
            </span>
            <span className="truncate text-sm font-semibold text-zinc-50">North Star</span>
          </Link>
          <div className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const isActive = item.href === "/"
                ? pathname === item.href
                : pathname === item.href || item.activePaths?.includes(pathname);

              return (
              <Button
                asChild
                key={item.href}
                variant="ghost"
                size="sm"
                className={cn(
                  "text-zinc-300 hover:text-zinc-50",
                  isActive && "bg-white/[0.08] text-zinc-50"
                )}
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/assistant">
                <Bot className="h-4 w-4" />
                Guide
              </Link>
            </Button>
            <CurrentUserMenu className="hidden lg:block" />
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {mobileNavOpen ? (
          <div className="grid gap-2 border-t border-white/10 py-4 lg:hidden">
            <CurrentUserMenu mobile />
            {navItems.map((item) => {
              const isActive = item.href === "/"
                ? pathname === item.href
                : pathname === item.href || item.activePaths?.includes(pathname);

              return (
              <Button
                asChild
                key={item.href}
                variant="ghost"
                className={cn(
                  "justify-start text-zinc-300 hover:text-zinc-50",
                  isActive && "bg-white/[0.08] text-zinc-50"
                )}
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
              );
            })}
            <Button asChild className="mt-2">
              <Link href="/assistant">
                <Bot className="h-4 w-4" />
                Guide
              </Link>
            </Button>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
