"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Footer } from "@/components/footer";
import { SiteNav } from "@/components/site-nav";

const chromeLessRoutes = new Set(["/auth/reset-password", "/auth/setup", "/client", "/login", "/leadership/login"]);

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
      <Footer />
    </>
  );
}
