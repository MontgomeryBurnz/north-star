"use client";

import { Card, CardContent } from "@/components/ui/card";

export function GuidedPlanEmptyStateCard() {
  return (
    <Card className="bg-zinc-950/80">
      <CardContent className="p-8">
        <p className="text-lg font-medium text-zinc-100">No guided plan selected yet.</p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Select a saved program to review the latest guided plan. New intake saves, active-program updates, and
          leadership reviews will refresh it automatically.
        </p>
      </CardContent>
    </Card>
  );
}
