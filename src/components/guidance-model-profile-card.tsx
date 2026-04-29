"use client";

import { BrainCircuit, CircleDollarSign, Database, Gauge } from "lucide-react";
import type { GuidanceModelProfile } from "@/lib/guidance-model-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GuidanceModelProfileCardProps = {
  guidanceModelProfile: GuidanceModelProfile;
  usageDescription: string;
};

export function GuidanceModelProfileCard({ guidanceModelProfile, usageDescription }: GuidanceModelProfileCardProps) {
  return (
    <Card className="bg-zinc-950/80">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center gap-2 text-zinc-50">
          <BrainCircuit className="h-4 w-4 text-cyan-200" />
          Guidance model
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 p-5">
        <div className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.055] p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-zinc-100">{guidanceModelProfile.model}</p>
            <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-100">
              {guidanceModelProfile.provider}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-zinc-400">{usageDescription}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
              <Gauge className="h-3.5 w-3.5 text-emerald-200" />
              Reasoning
            </p>
            <p className="mt-2 text-sm text-zinc-200">{guidanceModelProfile.reasoningEffort}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Verbosity</p>
            <p className="mt-2 text-sm text-zinc-200">{guidanceModelProfile.textVerbosity}</p>
          </div>
        </div>

        <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-3">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">
            <Database className="h-3.5 w-3.5" />
            Cache posture
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{guidanceModelProfile.cacheStrategy.summary}</p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">{guidanceModelProfile.cacheStrategy.detail}</p>
          <a
            href={guidanceModelProfile.cacheStrategy.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex text-xs font-medium text-cyan-200 hover:text-cyan-100"
          >
            {guidanceModelProfile.cacheStrategy.sourceLabel}
          </a>
        </div>

        {guidanceModelProfile.pricing ? (
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
              <CircleDollarSign className="h-3.5 w-3.5 text-emerald-200" />
              Standard API rate
            </p>
            <div className="mt-3 grid gap-2 text-sm text-zinc-300">
              <p>Input: {guidanceModelProfile.pricing.inputPerMillionTokens} / 1M tokens</p>
              <p>Cached input: {guidanceModelProfile.pricing.cachedInputPerMillionTokens} / 1M tokens</p>
              <p>Output: {guidanceModelProfile.pricing.outputPerMillionTokens} / 1M tokens</p>
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Actual cost depends on token volume from uploads, updates, leadership feedback, meeting context, governance flags, and generated output.
            </p>
            <a
              href={guidanceModelProfile.pricing.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex text-xs font-medium text-cyan-200 hover:text-cyan-100"
            >
              {guidanceModelProfile.pricing.sourceLabel}, {guidanceModelProfile.pricing.asOf}
            </a>
          </div>
        ) : (
          <div className="rounded-md border border-amber-300/20 bg-amber-300/[0.055] p-3 text-sm leading-6 text-zinc-300">
            Pricing for this configured model is not listed in the app yet. Check OpenAI pricing before sharing a cost estimate.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
