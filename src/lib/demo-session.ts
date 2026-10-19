import "server-only";
import { cookies } from "next/headers";
import { demoModeCookieName, demoModeValue } from "@/lib/demo-mode";

export async function isDemoMode() {
  try {
    return (await cookies()).get(demoModeCookieName)?.value === demoModeValue;
  } catch {
    // CLI maintenance scripts do not run in a Next request context.
    return false;
  }
}
