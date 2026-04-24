"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, CircleDot, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Console", href: "/" },
  { label: "New Program", href: "/new-program" },
  { label: "Active Program", href: "/active-program" },
  { label: "Guided Plans", href: "/systems" },
  { label: "Assistant", href: "/assistant" },
  { label: "Leadership", href: "/leadership" }
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-emerald-300/20 bg-emerald-300/10">
            <CircleDot className="h-4 w-4 text-emerald-200" />
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
          <Button asChild size="sm">
            <Link href="/assistant">
              <Bot className="h-4 w-4" />
              Guide
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="md:hidden" aria-label="Open navigation">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </nav>
    </header>
  );
}
