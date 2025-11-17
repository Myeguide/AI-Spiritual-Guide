import { verifyToken } from "@/lib/generate-token";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/types/payment";
import { NextRequest, NextResponse } from "next/server";
import { compareSync, hashSync } from 'bcrypt-ts';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.split(" ")[1];

        if (!token) {
            return NextResponse.json(
                { error: "Unauthorized - No token provided" },
                { status: 401 }
            );
        }

        const verified = verifyToken(token);
        if (!verified) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            )
        }
        const userId = verified.userId;
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized - Invalid token" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { oldPassword, newPassword } = body;
        // Validate input
        if (!oldPassword || !newPassword) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Old password and new password are required' },
                { status: 400 }
            );
        }

        // Validate new password strength
        if (newPassword.length < 8) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
                },
                { status: 400 }
            );
        }

        // Get user with current password
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, password: true },
        });

        if (!user) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        // Verify old password
        const isValidPassword = compareSync(oldPassword, user.password);
        if (!isValidPassword) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Current password is incorrect' },
                { status: 401 }
            );
        }
        // Check if new password is same as old password
        const isSamePassword = compareSync(newPassword, user.password);
        if (isSamePassword) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'New password must be different from current password' },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedPassword = hashSync(newPassword, 10);

        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            message: 'Password changed successfully',
        });

    } catch (error: any) {
        console.error('POST /api/user/change-password error:', error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Failed to change password' },
            { status: 500 }
        );
    }
}