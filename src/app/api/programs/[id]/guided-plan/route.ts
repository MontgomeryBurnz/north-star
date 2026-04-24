import { NextResponse } from "next/server";
import { createGuidedPlan, getLatestGuidedPlan } from "@/lib/program-store";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await params;
  const plan = await getLatestGuidedPlan(id);

  if (!plan) {
    return NextResponse.json({ plan: null });
  }

  return NextResponse.json({ plan });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await params;
  const plan = await createGuidedPlan(id);

  if (!plan) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 });
  }

  return NextResponse.json({ plan });
}
