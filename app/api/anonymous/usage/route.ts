import { NextRequest, NextResponse } from "next/server";
import {
  AnonymousUsageService
} from "@/lib/services/anonymous-usage.service";

function getAnonIdentifier(req: NextRequest): string {
  const headerId = req.headers.get("x-anonymous-id")?.trim();
  if (headerId) return headerId;

  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || req.headers.get("x-real-ip")?.trim() || "unknown-ip";
  const ua = req.headers.get("user-agent")?.slice(0, 120) || "unknown-ua";
  return `ip:${ip}|ua:${ua}`;
}

export async function GET(req: NextRequest) {
  try {
    const identifier = getAnonIdentifier(req);
    const status = await AnonymousUsageService.getStatus(
      identifier,
      Number(process.env.ANON_FREE_QUESTION_LIMIT)
    );
    return NextResponse.json({ success: true, data: status }, { status: 200 });
  } catch (error) {
    console.error("Anonymous usage error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch anonymous usage" },
      { status: 500 }
    );
  }
}


