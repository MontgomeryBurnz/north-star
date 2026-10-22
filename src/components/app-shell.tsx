"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Footer } from "@/components/footer";
import { SiteNav } from "@/components/site-nav";
import { DemoModeBanner } from "@/components/demo-mode-banner";

const chromeLessRoutes = new Set([
  "/auth/activate",
  "/auth/reset-password",
  "/auth/setup",
  "/client",
  "/login",
  "/leadership/login"
]);

export function AppShell({ children, demoMode = false, explorerMode = false }: { children: ReactNode; demoMode?: boolean; explorerMode?: boolean }) {
  const pathname = usePathname();
  const hideChrome = chromeLessRoutes.has(pathname);

  if (hideChrome) {
    return <>{demoMode ? <DemoModeBanner explorerMode={explorerMode} /> : null}{children}</>;
  }

  return (
    <>
      <SiteNav demoMode={demoMode} />
      {demoMode ? <DemoModeBanner explorerMode={explorerMode} /> : null}
      {children}
      <Footer />
    </>
  );
}
