import { NextResponse } from "next/server";
import { requireSiteAccessRequest } from "@/lib/api-route-access";

export async function POST(request: Request) {
  const denied = requireSiteAccessRequest(request);
  if (denied) return denied;

  return NextResponse.json(
    {
      error:
        "NorthStar chat guidance has been disabled. AI usage is now focused on intake, active updates, guided plans, Studio artifacts, leadership feedback, and executive dashboards."
    },
    { status: 410 }
  );
}
