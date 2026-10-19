import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { isDemoMode } from "@/lib/demo-session";

export const metadata: Metadata = {
  title: "North Star",
  description: "AI-assisted delivery guidance for active programs, risks, outputs, and next steps."
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const demoMode = await isDemoMode();
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <AppShell demoMode={demoMode}>{children}</AppShell>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
