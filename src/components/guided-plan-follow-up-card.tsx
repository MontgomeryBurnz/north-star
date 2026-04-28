"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GuidedPlanFollowUpCard({ questions }: { questions: string[] }) {
  return (
    <Card className="bg-zinc-950/80">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-zinc-50">Key Questions and Considerations</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 p-5">
        {questions.map((question) => (
          <p key={question} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-zinc-300">
            {question}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
