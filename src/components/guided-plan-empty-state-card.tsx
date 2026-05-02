"use client";

import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type GuidedPlanEmptyStateCardProps = {
  hasPrograms?: boolean;
};

export function GuidedPlanEmptyStateCard({ hasPrograms = false }: GuidedPlanEmptyStateCardProps) {
  return (
    <Card className="border-emerald-300/20 bg-emerald-300/[0.055]">
      <CardContent className="p-8">
        <div className="flex items-start gap-4">
          <div className="mt-1 rounded-md border border-emerald-300/25 bg-emerald-300/10 p-2 text-emerald-100">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">
              {hasPrograms ? "Select a program to begin" : "Create a program"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-50">
              {hasPrograms ? "Select a program to begin." : "Create a program to unlock guided plans."}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              {hasPrograms
                ? "Load one active program to review health, timeline, team action plans, and the evidence behind the current guidance."
                : "Save a program first. North Star will generate guided plans automatically as intake, uploads, program updates, and leadership feedback are captured."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
