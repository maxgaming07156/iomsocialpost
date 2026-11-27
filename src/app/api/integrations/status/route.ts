import { NextResponse } from "next/server";
import { getIntegrationsStatus } from "@/lib/integrationStatus";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getIntegrationsStatus();
  return NextResponse.json(status, { status: 200 });
}
