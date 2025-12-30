import { AuthMiddleware } from '@/app/middleware/middleware';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types/payment';
import { NextRequest, NextResponse } from 'next/server';
export async function PATCH(req: NextRequest) {
    try {
        const auth = AuthMiddleware(req);

        if ("error" in auth) {
            return NextResponse.json(auth, { status: auth.status });
        }
        const { userId } = auth;

        const body = await req.json();
        const { firstName, lastName, email, dob } = body;

        // Validate required fields
        if (!firstName || !lastName) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'First name and last name are required' },
                { status: 400 }
            );
        }

        // Validate email format if provided
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                firstName,
                lastName,
                ...(email && { email }),
                ...(dob && { dob: new Date(dob) }),
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