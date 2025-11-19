import { NextRequest, NextResponse } from 'next/server';
import { OTPService, OTPError } from '@/lib/services/otp.service';
import { SMSService, SMSError } from '@/lib/services/sms.service';
import { sendOTPSchema } from '@/lib/validators/auth.validator';
import z from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const { phoneNumber } = sendOTPSchema.parse(body);

    // Validate phone number FIRST using Twilio Lookup API
    // This prevents creating OTP for invalid numbers
    await SMSService.validatePhoneNumber(phoneNumber);
    
    // Generate and save OTP only after phone validation passes
    const code = await OTPService.createOTP(phoneNumber);

    // Send OTP via SMS
    await SMSService.sendOTP(phoneNumber, code);

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (error) {

    console.error('[API] Send OTP error:', error);
    // Handle OTP-specific errors
    if (error instanceof OTPError) {
      return NextResponse.json(
        { success: false, message: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    // Handle SMS-specific errors
    if (error instanceof SMSError) {
      return NextResponse.json(
        { success: false, message: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid request data', 
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    // Generic error handler
    console.error('[API] OTP send error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}