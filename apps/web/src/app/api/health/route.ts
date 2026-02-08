import { NextResponse } from "next/server";

// Lightweight endpoint for smoke checks and uptime probes.
export async function GET() {
  return NextResponse.json({ ok: true, service: "campaignmanager-api" });
}
