import "server-only";
import { cookies } from "next/headers";
import { createDemoProgramRepository } from "@/lib/demo-program-repository-core";

export async function getDemoProgramRepository() {
  return createDemoProgramRepository(await cookies());
}
