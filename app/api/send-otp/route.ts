import { NextRequest, NextResponse } from 'next/server';
import { OTPService } from '@/lib/services/otp.service';
import { SMSService } from '@/lib/services/sms.service';
import { sendOTPSchema } from '@/lib/validators/auth.validator';
import z from 'zod';
import { seedSubscriptionTiers } from '@/lib/rate-limiter';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // const res = seedSubscriptionTiers()

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
    console.error('Send OTP error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}