import { isExternalOnlyUserType } from "@/lib/admin-user-types";
import { sampleDiscoverySources, sampleDiscoverySynthesis, sampleProgram } from "@/data/sample-program";
import { createStudioPackage, listStudioPackages } from "@/lib/studio-collaboration-persistence";
import { StudioCollaborationError } from "@/lib/studio-collaboration-types";
import { readStudioJson, requireStudioIdentity, studioJson, studioRouteError } from "@/lib/studio-route-access";

export const dynamic = "force-dynamic";

export async function GET() {
  try { return studioJson({ packages: await listStudioPackages(await requireStudioIdentity()) }); }
  catch (error) { return studioRouteError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireStudioIdentity();
    if (isExternalOnlyUserType(user.userType)) throw new StudioCollaborationError("Only internal users can create Studio packages.", 403);
    const body = await readStudioJson(request, 16_000);
    // No browser-submitted readiness/quality flags can become a trusted revision.
    // This endpoint saves only the explicitly labeled, server-owned example.
    if (body.action !== "create-example") throw new StudioCollaborationError("Generate a package in Studio, or save the prepared example.");
    const saved = await createStudioPackage(user, {
      title: `${sampleProgram.name} · Prepared example`, synthesis: sampleDiscoverySynthesis,
      sources: sampleDiscoverySources, selectedOutputs: ["roadmap", "backlog", "stories", "tests", "gaps", "analysis"],
      provenance: "prepared-example", resolutionNotes: "Prepared fictional example, not a new OpenAI generation.",
      externalResearch: false, researchTopic: ""
    });
    return studioJson({ package: saved }, 201);
  } catch (error) { return studioRouteError(error); }
}
