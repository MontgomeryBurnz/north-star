import { NextResponse } from "next/server";
import { getLatestGuidedPlan, listLeadershipFeedback } from "@/lib/program-store";
import { buildDeliveryLeadershipSignal } from "@/lib/leadership-signal";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const [feedbacks, plan] = await Promise.all([listLeadershipFeedback(id), getLatestGuidedPlan(id)]);
  const latestFeedback = feedbacks[0] ?? null;
  const signal = buildDeliveryLeadershipSignal(latestFeedback, plan);

  return NextResponse.json({ signal });
}
