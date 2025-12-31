import { NextRequest, NextResponse } from 'next/server';
import { SMSService } from '@/lib/services/sms.service';
import { prisma } from '@/lib/prisma';
import { hashSync } from 'bcrypt-ts';
import { z } from 'zod';

// Validation schema for reset password
const resetPasswordSchema = z.object({
    phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
    code: z.string().length(6, 'OTP must be 6 digits'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
            /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/,
            'Password must include 1 uppercase letter, 1 number, and 1 special character'
        ),
});

/**
 * POST /api/auth/reset-password
 * Verify OTP and reset user password
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const { phoneNumber, code, newPassword } = resetPasswordSchema.parse(body);

        // Verify OTP via MSG91
        const isValid = await SMSService.verifyOTPViaMSG91(phoneNumber, code);

        if (!isValid) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Invalid or expired OTP',
                    code: 'INVALID_OTP',
                },
                { status: 400 }
            );
        }

        // Find user by phone number
        const user = await prisma.user.findUnique({
            where: { phoneNumber },
            select: { id: true },
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

        // Hash the new password
        const hashedPassword = hashSync(newPassword, 10);

        // Update user password
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        // Delete any remaining OTP records for this phone number
        await prisma.otpCode.deleteMany({
            where: {
                phoneNumber,
                isUsed: false,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password.',
        });
    } catch (error) {
        console.error('[API] Reset password error:', error);

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

