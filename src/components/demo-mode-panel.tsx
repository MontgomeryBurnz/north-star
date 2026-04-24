"use client";

import { useEffect, useState } from "react";
import { contentRegistry } from "@/data";

export function DemoModePanel() {
  const [open, setOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem("operator-demo-mode");
    if (stored) setDemoMode(stored === "true");
  }, []);

  function toggleDemoMode() {
    setDemoMode((current) => {
      const next = !current;
      window.localStorage.setItem("operator-demo-mode", String(next));
      return next;
    });
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[280px] rounded-lg border border-white/10 bg-zinc-950/90 shadow-glow backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-zinc-400"
      >
        Test mode
        <span className={demoMode ? "text-emerald-200" : "text-zinc-600"}>{demoMode ? "on" : "off"}</span>
      </button>
      {open ? (
        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            onClick={toggleDemoMode}
            className="mb-3 w-full rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-zinc-200 hover:border-emerald-300/30"
          >
            Seeded content {demoMode ? "visible" : "hidden"}
          </button>
          {demoMode ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["initiatives", contentRegistry.initiatives.length],
                ["frameworks", contentRegistry.frameworks.length],
                ["AI products", contentRegistry.aiProducts.length],
                ["experiments", contentRegistry.experiments.length],
                ["FAQs", contentRegistry.assistantFaqs.length],
                ["profile records", 1]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-white/10 bg-black/20 p-2">
                  <p className="text-zinc-500">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-zinc-50">{value}</p>
                </div>
              ))}
            </div>
          ) : null}
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            Assistant debug output shows matched local records and scores when demo mode is enabled.
          </p>
        </div>
      ) : null}
    </div>
  );
}
