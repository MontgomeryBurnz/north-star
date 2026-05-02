import { NextResponse } from "next/server";
import { auditActorFromAccess } from "@/lib/audit-event-service";
import { buildGuidanceModelProfile } from "@/lib/guidance-model-profile";
import { getGuidanceModelSettings, saveGuidanceModelSettings } from "@/lib/guidance-model-settings";
import {
  guidanceModelOptions,
  guidanceProviderOptions,
  guidanceReasoningEffortOptions,
  guidanceVerbosityOptions,
  normalizeGuidanceModelSettings,
  type GuidanceModelSettings
} from "@/lib/guidance-model-settings-types";
import { getAdminAccessContext } from "@/lib/leadership-auth";
import { createAuditEvent } from "@/lib/program-store";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

function isSupportedOption(value: unknown, options: readonly string[]) {
  return typeof value === "string" && options.includes(value);
}

async function requireAdminAccess(request: Request) {
  const access = await getAdminAccessContext();
  if (!access.authorized) {
    if (!isSiteAccessRequestAuthorized(request)) {
      return { access, response: createSiteAccessDeniedResponse() };
    }

    return { access, response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  return { access, response: null };
}

export async function GET(request: Request) {
  const { response } = await requireAdminAccess(request);
  if (response) return response;

  const settings = await getGuidanceModelSettings();
  return NextResponse.json({
    options: {
      models: guidanceModelOptions,
      providers: guidanceProviderOptions,
      reasoningEfforts: guidanceReasoningEffortOptions,
      textVerbosities: guidanceVerbosityOptions
    },
    profile: buildGuidanceModelProfile(settings),
    settings
  });
}

export async function PUT(request: Request) {
  const { access, response } = await requireAdminAccess(request);
  if (response) return response;

  const body = (await request.json().catch(() => ({}))) as Partial<GuidanceModelSettings>;
  const existing = await getGuidanceModelSettings();
  const candidate = normalizeGuidanceModelSettings(body, existing);

  if (body.provider && !isSupportedOption(body.provider, guidanceProviderOptions)) {
    return NextResponse.json({ error: "Unsupported guidance provider." }, { status: 400 });
  }

  if (body.model && !guidanceModelOptions.includes(body.model as (typeof guidanceModelOptions)[number])) {
    return NextResponse.json({ error: "Unsupported OpenAI model." }, { status: 400 });
  }

  if (body.reasoningEffort && !isSupportedOption(body.reasoningEffort, guidanceReasoningEffortOptions)) {
    return NextResponse.json({ error: "Unsupported reasoning effort." }, { status: 400 });
  }

  if (body.textVerbosity && !isSupportedOption(body.textVerbosity, guidanceVerbosityOptions)) {
    return NextResponse.json({ error: "Unsupported text verbosity." }, { status: 400 });
  }

  const actor = auditActorFromAccess(access);
  const settings = await saveGuidanceModelSettings(candidate, actor?.email ?? actor?.name ?? "Admin");
  await createAuditEvent({
    actor,
    entityId: "guidance_model_settings",
    entityLabel: settings.model,
    entityType: "app-setting",
    eventType: "model.settings.update",
    metadata: {
      model: settings.model,
      previousModel: existing.model,
      previousReasoningEffort: existing.reasoningEffort,
      previousTextVerbosity: existing.textVerbosity,
      provider: settings.provider,
      reasoningEffort: settings.reasoningEffort,
      textVerbosity: settings.textVerbosity
    },
    summary: `Guidance model settings were updated to ${settings.model}.`,
    surface: "Admin"
  });

  return NextResponse.json({
    profile: buildGuidanceModelProfile(settings),
    settings
  });
}
