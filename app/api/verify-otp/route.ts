import { NextRequest, NextResponse } from "next/server";
import { verifyOTP } from "@/lib/services/verify-otp";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { generateToken } from "@/lib/generate-token";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const { phoneNumber, code, firstName, lastName, email, age } = body as {
            phoneNumber?: string;
            code?: string;
            firstName: string;
            lastName: string;
            email?: string;
            age?: number
        };

        // 🧩 Input validation
        if (!phoneNumber?.trim() || !code?.trim()) {
            return NextResponse.json(
                { success: false, error: "Phone number and OTP are required" },
                { status: 400 }
            );
        }

        // 📞 E.164 phone format validation
        const phoneRegex = /^\+?[1-9]\d{7,14}$/;
        if (!phoneRegex.test(phoneNumber)) {
            return NextResponse.json(
                { success: false, error: "Invalid phone number format" },
                { status: 400 }
            );
        }

        // 🔐 Verify OTP
        const verificationResult = await verifyOTP(phoneNumber, code);

        if (!verificationResult.success || !verificationResult.userId) {
            return NextResponse.json(
                { success: false, error: verificationResult.message || "Invalid or expired OTP" },
                { status: 401 }
            );
        }

        const userId = verificationResult.userId;

        // 👤 Optional: Update user details if provided (first-time signup)
        if (firstName?.trim()) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    email,
                    age
                },
            });
        }

        const sessionToken = generateToken(userId, phoneNumber);

        // 🍪 Create session & set cookie
        const cookieStore = await cookies();
        cookieStore.set("session-token", sessionToken, {
            httpOnly: true,                                  // JS cannot access
            secure: process.env.NODE_ENV === "production",   // HTTPS only in production
            sameSite: "lax",                                 // CSRF protection
            maxAge: 30 * 24 * 60 * 60,                       // 30 days
            path: "/",                                       // Available across app
        });

        // 📦 Fetch user details to return
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                email: true,
                age: true,
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: "Login successful",
                token: sessionToken,
                user,
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("[POST /api/verify-otp] ❌ Error:", error instanceof Error ? error.message : error);

        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    } finally {
        // 🧹 Ensure no connection leaks in serverless
        if (process.env.NODE_ENV === "production") {
            await prisma.$disconnect().catch(() => { });
        }
    }
}