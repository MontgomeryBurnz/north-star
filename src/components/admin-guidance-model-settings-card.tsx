"use client";

import { useMemo, useState } from "react";
import { AlertCircle, BrainCircuit, CheckCircle2, ChevronDown, CircleDollarSign, Database, Gauge, Save } from "lucide-react";
import type { GuidanceModelProfile } from "@/lib/guidance-model-profile";
import {
  guidanceModelOptions,
  guidanceProviderOptions,
  guidanceReasoningEffortOptions,
  guidanceVerbosityOptions
} from "@/lib/guidance-model-settings-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AdminGuidanceModelSettingsCardProps = {
  initialProfile: GuidanceModelProfile;
  usageDescription: string;
};

type ModelSettingsPayload = {
  model: string;
  provider: GuidanceModelProfile["provider"];
  reasoningEffort: string;
  textVerbosity: string;
};

type SaveStatus = {
  message: string;
  tone: "info" | "success" | "error";
};

function formatDate(value: string | undefined) {
  if (!value) return "Using environment defaults";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

async function getFailureMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? fallback;
}

function SelectControl<T extends string>({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: T) => void;
  options: readonly T[];
  value: T;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className="h-10 w-full appearance-none rounded-md border border-white/10 bg-zinc-950 px-3 pr-9 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      </span>
    </label>
  );
}

export function AdminGuidanceModelSettingsCard({
  initialProfile,
  usageDescription
}: AdminGuidanceModelSettingsCardProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [settings, setSettings] = useState<ModelSettingsPayload>({
    model: initialProfile.model,
    provider: initialProfile.provider,
    reasoningEffort: initialProfile.reasoningEffort,
    textVerbosity: initialProfile.textVerbosity
  });
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<SaveStatus | null>(null);

  const hasChanges = useMemo(
    () =>
      settings.model !== profile.model ||
      settings.provider !== profile.provider ||
      settings.reasoningEffort !== profile.reasoningEffort ||
      settings.textVerbosity !== profile.textVerbosity,
    [profile.model, profile.provider, profile.reasoningEffort, profile.textVerbosity, settings]
  );

  async function saveSettings() {
    setIsSaving(true);
    setStatus({ message: "Saving model settings...", tone: "info" });
    try {
      const response = await fetch("/api/admin/model-settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(settings)
      });
      if (!response.ok) throw new Error(await getFailureMessage(response, "Model settings could not be saved."));
      const payload = (await response.json()) as { profile: GuidanceModelProfile };
      setProfile(payload.profile);
      setSettings({
        model: payload.profile.model,
        provider: payload.profile.provider,
        reasoningEffort: payload.profile.reasoningEffort,
        textVerbosity: payload.profile.textVerbosity
      });
      setStatus({
        message: `Model settings changed to ${payload.profile.model}. New guidance requests will use this configuration.`,
        tone: "success"
      });
    } catch (error) {
      setStatus({
        message: error instanceof Error ? error.message : "Model settings could not be saved.",
        tone: "error"
      });
    } finally {
      setIsSaving(false);
    }
  }

  const statusClassName =
    status?.tone === "success"
      ? "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-50"
      : status?.tone === "error"
        ? "border-amber-300/25 bg-amber-300/[0.08] text-amber-50"
        : "border-cyan-300/20 bg-cyan-300/[0.055] text-cyan-50";

  return (
    <Card className="bg-zinc-950/80">
      <CardHeader className="border-b border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-zinc-50">
            <BrainCircuit className="h-4 w-4 text-cyan-200" />
            OpenAI Guidance Model
          </CardTitle>
          <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-100">
            {profile.provider}
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 p-5">
        <div className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.055] p-3">
          <p className="text-sm font-medium text-zinc-100">{profile.model}</p>
          <p className="mt-2 text-xs leading-5 text-zinc-400">{usageDescription}</p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Last updated: {formatDate(profile.settingsUpdatedAt)}
            {profile.settingsUpdatedBy ? ` by ${profile.settingsUpdatedBy}` : ""}
          </p>
        </div>

        <div className="grid gap-3">
          <SelectControl
            label="Provider"
            value={settings.provider}
            options={guidanceProviderOptions}
            onChange={(provider) => setSettings((current) => ({ ...current, provider }))}
          />
          <SelectControl
            label="Model"
            value={settings.model}
            options={guidanceModelOptions}
            onChange={(model) => setSettings((current) => ({ ...current, model }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectControl
              label="Reasoning"
              value={settings.reasoningEffort}
              options={guidanceReasoningEffortOptions}
              onChange={(reasoningEffort) => setSettings((current) => ({ ...current, reasoningEffort }))}
            />
            <SelectControl
              label="Verbosity"
              value={settings.textVerbosity}
              options={guidanceVerbosityOptions}
              onChange={(textVerbosity) => setSettings((current) => ({ ...current, textVerbosity }))}
            />
          </div>
          <Button type="button" onClick={() => void saveSettings()} disabled={!hasChanges || isSaving}>
            {isSaving ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Saving" : "Save model settings"}
          </Button>
          {status ? (
            <div
              className={`flex items-start gap-3 rounded-md border p-3 text-sm leading-6 ${statusClassName}`}
              role={status.tone === "error" ? "alert" : "status"}
              data-admin-model-settings-confirmation
            >
              {status.tone === "error" ? (
                <AlertCircle className="mt-1 h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" />
              )}
              <span>{status.message}</span>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
              <Gauge className="h-3.5 w-3.5 text-emerald-200" />
              Reasoning
            </p>
            <p className="mt-2 text-sm text-zinc-200">{profile.reasoningEffort}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Verbosity</p>
            <p className="mt-2 text-sm text-zinc-200">{profile.textVerbosity}</p>
          </div>
        </div>

        <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-3">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">
            <Database className="h-3.5 w-3.5" />
            Cache posture
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{profile.cacheStrategy.summary}</p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">{profile.cacheStrategy.detail}</p>
          <a
            href={profile.cacheStrategy.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex text-xs font-medium text-cyan-200 hover:text-cyan-100"
          >
            {profile.cacheStrategy.sourceLabel}
          </a>
        </div>

        {profile.pricing ? (
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
              <CircleDollarSign className="h-3.5 w-3.5 text-emerald-200" />
              Standard API rate
            </p>
            <div className="mt-3 grid gap-2 text-sm text-zinc-300">
              <p>Input: {profile.pricing.inputPerMillionTokens} / 1M tokens</p>
              <p>Cached input: {profile.pricing.cachedInputPerMillionTokens} / 1M tokens</p>
              <p>Output: {profile.pricing.outputPerMillionTokens} / 1M tokens</p>
            </div>
            <a
              href={profile.pricing.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-xs font-medium text-cyan-200 hover:text-cyan-100"
            >
              {profile.pricing.sourceLabel}, {profile.pricing.asOf}
            </a>
          </div>
        ) : (
          <div className="rounded-md border border-amber-300/20 bg-amber-300/[0.055] p-3 text-sm leading-6 text-zinc-300">
            Pricing for this model is not listed in the app yet. Check provider pricing before sharing a cost estimate.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
