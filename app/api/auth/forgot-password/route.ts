import { NextRequest, NextResponse } from 'next/server';
import { OTPService, OTPError } from '@/lib/services/otp.service';
import { SMSService, SMSError } from '@/lib/services/sms.service';
import { sendOTPSchema } from '@/lib/validators/auth.validator';
import { prisma } from '@/lib/prisma';
import z from 'zod';

/**
 * POST /api/auth/forgot-password
 * Send OTP to registered phone number for password reset
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const { phoneNumber } = sendOTPSchema.parse(body);

        // Check if user exists with this phone number
        const user = await prisma.user.findUnique({
            where: { phoneNumber },
            select: { id: true, phoneNumber: true },
        });

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'No account found with this phone number',
                    code: 'USER_NOT_FOUND',
                },
                { status: 404 }
            );
        }

        // Validate phone number using Twilio Lookup API
        await SMSService.validatePhoneNumber(phoneNumber);

        // Generate OTP (uses generateOTP which doesn't check if user exists)
        const result = await OTPService.generateOTP(phoneNumber);

        if (!result.success || !result.code) {
            return NextResponse.json(
                { success: false, message: 'Failed to generate OTP' },
                { status: 500 }
            );
        }

        // Send OTP via SMS
        await SMSService.sendOTP(phoneNumber, result.code);

        return NextResponse.json({
            success: true,
            message: 'OTP sent successfully. Please check your phone.',
        });
    } catch (error) {
        console.error('[API] Forgot password error:', error);

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
                    errors: error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                },
                { status: 400 }
            );
        }

        // Generic error handler
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}

