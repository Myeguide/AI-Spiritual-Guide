import { NextRequest, NextResponse } from 'next/server';
import { OTPService, OTPError } from '@/lib/services/otp.service';
import { verifyOTPSchema } from '@/lib/validators/auth.validator';
import { z } from 'zod';
import { SMSService } from '@/lib/services/sms.service';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const { phoneNumber, code } = verifyOTPSchema.parse(body);

        // Verify OTP
        const isValid = await SMSService.verifyOTPViaMSG91(phoneNumber, code);

        if (!isValid) {
            return NextResponse.json(
                { success: false, error: 'Invalid or expired OTP' },
                { status: 400 }
            );
        }

        // Delete OTP record from database after successful verification
        await prisma.otpCode.deleteMany({
            where: {
                phoneNumber,
                code,
                isUsed: false,
                expiresAt: { gte: new Date() },
            },
        });

        return NextResponse.json({
            success: true,
            message: 'OTP verified successfully',
            data: { phoneNumber } // Send back for registration step
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

        console.error('[API] OTP verify error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}