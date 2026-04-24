import { NextResponse } from "next/server";
import { listPrograms, upsertProgram } from "@/lib/program-store";
import type { ProgramIntake } from "@/lib/program-intake-types";

export async function GET() {
  const programs = await listPrograms();
  return NextResponse.json({ programs });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ProgramIntake>;

  if (!body.programName?.trim()) {
    return NextResponse.json({ error: "Program name is required." }, { status: 400 });
  }

  const program = await upsertProgram({
    programName: body.programName,
    vision: body.vision ?? "",
    sowSummary: body.sowSummary ?? "",
    outcomes: body.outcomes ?? "",
    stakeholders: body.stakeholders ?? "",
    risks: body.risks ?? "",
    constraints: body.constraints ?? "",
    currentStatus: body.currentStatus ?? "",
    decisionsNeeded: body.decisionsNeeded ?? "",
    blockers: body.blockers ?? "",
    artifacts: body.artifacts ?? [],
    reviewedContext: body.reviewedContext
  });

  return NextResponse.json({ program });
}
