import { NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type SupportedTokenType = "email" | "invite" | "magiclink" | "recovery" | "signup";

function getSafeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/auth/setup";
  return value;
}

function getTokenType(value: string | null | undefined): SupportedTokenType | null {
  if (
    value === "email" ||
    value === "invite" ||
    value === "magiclink" ||
    value === "recovery" ||
    value === "signup"
  ) {
    return value;
  }

  return null;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "User account access is not configured." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    nextPath?: string;
    token?: string;
    tokenHash?: string;
    type?: string;
  };
  const type = getTokenType(body.type);
  const tokenHash = body.tokenHash?.trim() ?? "";
  const token = body.token?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";

  if (!type || (!tokenHash && !(email && token))) {
    return NextResponse.json({ error: "This setup or recovery link is invalid or expired." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = tokenHash
    ? await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type
      })
    : await supabase.auth.verifyOtp({
        email,
        token,
        type
      });

  if (error) {
    return NextResponse.json({ error: "This setup or recovery link is invalid or expired." }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    redirectTo: type === "recovery" ? "/auth/reset-password" : getSafeNextPath(body.nextPath)
  });
}
