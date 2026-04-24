"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DemoModePanel } from "@/components/demo-mode-panel";
import { Footer } from "@/components/footer";
import { SiteNav } from "@/components/site-nav";

const chromeLessRoutes = new Set(["/login", "/leadership/login"]);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideChrome = chromeLessRoutes.has(pathname);

  if (hideChrome) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteNav />
      {children}
      <DemoModePanel />
      <Footer />
    </>
  );
}
