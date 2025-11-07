import { NextRequest, NextResponse } from 'next/server';
import { OTPService, OTPError } from '@/lib/services/otp.service';
import { SMSService } from '@/lib/services/sms.service';
import { sendOTPSchema } from '@/lib/validators/auth.validator';
import z from 'zod';
// import { seedSubscriptionTiers } from '@/lib/rate-limiter';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // const res = seedSubscriptionTiers()
    // return;

    // Validate input
    const { phoneNumber } = sendOTPSchema.parse(body);

    // Generate and save OTP
    const code = await OTPService.createOTP(phoneNumber);

    // Send OTP via SMS
    await SMSService.sendOTP(phoneNumber, code);

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (error) {
    if (error instanceof OTPError) {
      return NextResponse.json(
        { success: false, message: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid request data', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('[API] OTP send error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}