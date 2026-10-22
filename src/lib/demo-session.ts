import "server-only";
import { cookies } from "next/headers";
import { demoModeCookieName, demoModeValue } from "@/lib/demo-mode";
import { getCurrentManagedUser } from "@/lib/current-managed-user";

export async function isDemoMode() {
  // Role is authoritative. Removing the sample cookie cannot expose live data.
  const user = await getCurrentManagedUser();
  if (user?.userType === "explorer") return true;
  try {
    return (await cookies()).get(demoModeCookieName)?.value === demoModeValue;
  } catch {
    // CLI maintenance scripts do not run in a Next request context.
    return false;
  }
}
