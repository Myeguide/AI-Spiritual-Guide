import { SMSService } from "@/lib/services/sms.service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";


const resendOTPSchema = z.object({
    phoneNumber: z.string().min(10, "Phone number is required"),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validatedData = resendOTPSchema.parse(body);
        const { phoneNumber } = validatedData;

        // Generate and send new OTP
        await SMSService.resendOTP(phoneNumber, 'text');

        return NextResponse.json({
            success: true,
            message: "OTP resent successfully",
        });
    } catch (error) {
        console.error("[POST /api/auth/resend-otp] ❌ Error:", error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0].message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: "Failed to resend OTP" },
            { status: 500 }
        );
    }
}