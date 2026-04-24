import { NextResponse } from "next/server";
import { createGuidedPlan, getLatestGuidedPlan } from "@/lib/program-store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await getLatestGuidedPlan(id);

  if (!plan) {
    return NextResponse.json({ plan: null });
  }

  return NextResponse.json({ plan });
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await createGuidedPlan(id);

  if (!plan) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 });
  }

  return NextResponse.json({ plan });
}
