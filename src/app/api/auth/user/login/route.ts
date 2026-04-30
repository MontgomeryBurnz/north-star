import { NextResponse } from "next/server";
import { attachSiteAccessCookie } from "@/lib/site-access";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "User account access is not configured." }, { status: 400 });
  }

  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  return attachSiteAccessCookie(NextResponse.json({ ok: true }));
}
