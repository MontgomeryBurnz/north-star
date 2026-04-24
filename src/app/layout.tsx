import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { DemoModePanel } from "@/components/demo-mode-panel";
import { Footer } from "@/components/footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "North Star",
  description: "AI-assisted delivery guidance for active programs, risks, outputs, and next steps."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <SiteNav />
        {children}
        <DemoModePanel />
        <Footer />
      </body>
    </html>
  );
}
