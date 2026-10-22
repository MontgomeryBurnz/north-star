import "server-only";
import { cookies } from "next/headers";
import { createDemoProgramRepository } from "@/lib/demo-program-repository-core";
import { getCurrentManagedUser } from "@/lib/current-managed-user";

export async function getDemoProgramRepository() {
  if ((await getCurrentManagedUser())?.userType === "explorer") {
    // Never load editable sample-session cookies for a read-only Explorer.
    return createDemoProgramRepository({ get: () => undefined, set: () => { throw new Error("Explorer sample data is read-only."); } });
  }
  return createDemoProgramRepository(await cookies());
}
