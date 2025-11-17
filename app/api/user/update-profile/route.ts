import { verifyToken } from '@/lib/generate-token';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types/payment';
import { NextRequest, NextResponse } from 'next/server';
export async function PATCH(req: NextRequest) {
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
        const { firstName, lastName } = body;

        // Validate required fields
        if (!firstName || !lastName) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'First name and last name are required' },
                { status: 400 }
            );
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                firstName,
                lastName,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
                dob: true,
                age: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: updatedUser,
            message: 'Profile updated successfully',
        });
    } catch (error: any) {
        console.error('PATCH /api/user/profile error:', error);
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}