import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { isDemoMode } from "@/lib/demo-session";
import { getCurrentManagedUser } from "@/lib/current-managed-user";
import { ExplorerMode } from "@/components/explorer-mode";

export const metadata: Metadata = {
  title: "North Star",
  description: "AI-assisted delivery guidance for active programs, risks, outputs, and next steps."
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const demoMode = await isDemoMode();
  const explorerMode = (await getCurrentManagedUser())?.userType === "explorer";
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <ExplorerMode enabled={explorerMode}><AppShell demoMode={demoMode} explorerMode={explorerMode}>{children}</AppShell></ExplorerMode>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
