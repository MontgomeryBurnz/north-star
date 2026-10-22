import "server-only";
import { NextResponse } from "next/server";
import { getCurrentManagedUser } from "@/lib/current-managed-user";
import { explorerRestrictionMessage, isExplorerRequestAllowed } from "@/lib/explorer-policy";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function denyExplorerRequest(request: Request) {
  const user = await getCurrentManagedUser();
  if (user?.userType !== "explorer") {
    // A legacy shared site cookie is not an individual account. Without this
    // gate, dropping a Supabase cookie could bypass a restricted account role.
    if (isSupabaseConfigured() && (!user || user.credentialStatus !== "active")) {
      return NextResponse.json({ error: "Sign in with an active NorthStar account.", code: "NAMED_ACCOUNT_REQUIRED" }, {
        status: 401, headers: { "Cache-Control": "private, no-store" }
      });
    }
    return null;
  }
  if (user.credentialStatus === "active" && isExplorerRequestAllowed(request.method, new URL(request.url).pathname)) return null;
  return NextResponse.json({ error: explorerRestrictionMessage, code: "EXPLORER_READ_ONLY" }, {
    status: 403, headers: { "Cache-Control": "private, no-store" }
  });
}
