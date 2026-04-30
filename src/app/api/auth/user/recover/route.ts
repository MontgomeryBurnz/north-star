import { NextResponse } from "next/server";
import {
  buildNorthStarRecoveryEmail,
  buildNorthStarRecoveryText,
  getNorthStarEmailDeliveryStatus,
  sendNorthStarEmail
} from "@/lib/north-star-auth-emails";
import { buildPublicAppUrl } from "@/lib/public-origin";
import { createSupabaseAdminClient, createSupabaseServerClient, isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/supabase/server";

function getRecoveryRedirectUrl(request: Request) {
  const redirectTo = buildPublicAppUrl("/auth/callback", request);
  redirectTo.searchParams.set("next", "/auth/reset-password");
  return redirectTo.toString();
}

function getRecoveryActionUrl(request: Request, tokenHash: string) {
  const actionUrl = buildPublicAppUrl("/auth/callback", request);
  actionUrl.searchParams.set("token_hash", tokenHash);
  actionUrl.searchParams.set("type", "recovery");
  actionUrl.searchParams.set("next", "/auth/reset-password");
  return actionUrl.toString();
}

async function sendBrandedRecoveryEmail(email: string, request: Request) {
  if (!isSupabaseAdminConfigured() || !getNorthStarEmailDeliveryStatus().configured) return false;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    email,
    options: {
      redirectTo: getRecoveryRedirectUrl(request)
    },
    type: "recovery"
  });

  if (error || !data.properties?.action_link) {
    return false;
  }

  const actionUrl = data.properties.hashed_token
    ? getRecoveryActionUrl(request, data.properties.hashed_token)
    : data.properties.action_link;

  await sendNorthStarEmail({
    html: buildNorthStarRecoveryEmail({
      actionUrl,
      recipientEmail: email
    }),
    subject: "Reset your North Star access",
    text: buildNorthStarRecoveryText({
      actionUrl,
      recipientEmail: email
    }),
    to: email
  });

  return true;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "User account recovery is not configured." }, { status: 400 });
  }

  const body = (await request.json()) as {
    email?: string;
  };
  const email = body.email?.trim().toLowerCase() ?? "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  try {
    const sentBrandedEmail = await sendBrandedRecoveryEmail(email, request);
    if (!sentBrandedEmail) {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getRecoveryRedirectUrl(request)
      });
    }
  } catch {
    // Keep the recovery response generic so the endpoint cannot confirm whether an account exists.
  }

  return NextResponse.json({
    ok: true,
    message: "If an active North Star account exists for that email, recovery instructions have been sent."
  });
}
