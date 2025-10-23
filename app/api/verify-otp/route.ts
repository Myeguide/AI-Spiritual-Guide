import { NextRequest, NextResponse } from 'next/server';
import { OTPService } from '@/lib/services/otp.service';
import { verifyOTPSchema } from '@/lib/validators/auth.validator';
import { z } from 'zod';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const { phoneNumber, code } = verifyOTPSchema.parse(body);

        // Verify OTP
        const isValid = await OTPService.verifyOTP(phoneNumber, code);

        if (!isValid) {
            return NextResponse.json(
                { success: false, error: 'Invalid or expired OTP' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'OTP verified successfully',
            data: { phoneNumber } // Send back for registration step
        });

    } catch (error) {
        console.error('Verify OTP error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0].message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Failed to verify OTP' },
            { status: 500 }
        );
    }
}