import { NextResponse } from "next/server";
import {
  buildNorthStarRecoveryEmail,
  buildNorthStarRecoveryText,
  getNorthStarEmailDeliveryStatus,
  sendNorthStarEmail
} from "@/lib/north-star-auth-emails";
import { createSupabaseAdminClient, createSupabaseServerClient, isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/supabase/server";

function getRecoveryRedirectUrl(requestUrl: string) {
  const origin = new URL(requestUrl).origin;
  const redirectTo = new URL("/auth/callback", origin);
  redirectTo.searchParams.set("next", "/auth/reset-password");
  return redirectTo.toString();
}

async function sendBrandedRecoveryEmail(email: string, requestUrl: string) {
  if (!isSupabaseAdminConfigured() || !getNorthStarEmailDeliveryStatus().configured) return false;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    email,
    options: {
      redirectTo: getRecoveryRedirectUrl(requestUrl)
    },
    type: "recovery"
  });

  if (error || !data.properties?.action_link) {
    return false;
  }

  await sendNorthStarEmail({
    html: buildNorthStarRecoveryEmail({
      actionUrl: data.properties.action_link,
      recipientEmail: email
    }),
    subject: "Reset your North Star access",
    text: buildNorthStarRecoveryText({
      actionUrl: data.properties.action_link,
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
    const sentBrandedEmail = await sendBrandedRecoveryEmail(email, request.url);
    if (!sentBrandedEmail) {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getRecoveryRedirectUrl(request.url)
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
