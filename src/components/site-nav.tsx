"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedNorthStarMark } from "@/components/login-brand-mark";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Console", href: "/" },
  { label: "New Program", href: "/new-program" },
  { label: "Active Program", href: "/active-program" },
  { label: "Guided Plans", href: "/systems" },
  { label: "Admin", href: "/admin" },
  { label: "Leadership", href: "/leadership" }
];

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
          <div className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Button
                asChild
                key={item.href}
                variant="ghost"
                size="sm"
                className={cn(
                  "text-zinc-300 hover:text-zinc-50",
                  pathname === item.href && "bg-white/[0.08] text-zinc-50"
                )}
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/assistant">
                <Bot className="h-4 w-4" />
                Guide
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {mobileNavOpen ? (
          <div className="grid gap-2 border-t border-white/10 py-4 md:hidden">
            {navItems.map((item) => (
              <Button
                asChild
                key={item.href}
                variant="ghost"
                className={cn(
                  "justify-start text-zinc-300 hover:text-zinc-50",
                  pathname === item.href && "bg-white/[0.08] text-zinc-50"
                )}
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
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
