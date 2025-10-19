import { NextRequest, NextResponse } from "next/server";
import { sendOTP } from "@/lib/services/send-otp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phoneNumber } = body as { phoneNumber?: string };

    // Validate presence
    if (!phoneNumber?.trim()) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Validate format using E.164 (international) standard
    const phoneRegex = /^\+?[1-9]\d{7,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // Send OTP
    const result = await sendOTP(phoneNumber);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message || "Failed to send OTP" },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "OTP sent successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/send-otp] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}