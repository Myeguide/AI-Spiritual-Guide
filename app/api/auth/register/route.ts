import { NextRequest, NextResponse } from "next/server";
import { OTPService } from "@/lib/services/otp.service";
import { UserService } from "@/lib/services/user.service";
import { registerSchema } from "@/lib/validators/auth.validator";
import { cookies } from "next/headers";
import { generateToken } from "@/lib/generate-token";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // 🧩 Validate input with Zod
        const validatedData = registerSchema.parse(body);
        const { phoneNumber, code, firstName, lastName, email, age } = validatedData;

        // 🔐 Verify OTP
        const isValid = await OTPService.verifyOTP(phoneNumber, code);

        if (!isValid) {
            return NextResponse.json(
                { success: false, error: "Invalid or expired OTP" },
                { status: 401 }
            );
        }

        // 🔍 Check if user already exists
        let user = await UserService.getUserByPhoneOrEmail(phoneNumber, email);

        if (user) {
            // User already exists - they should use login flow instead
            return NextResponse.json(
                {
                    success: false,
                    error: "User already exists. Please use login instead of registration."
                },
                { status: 409 } // 409 Conflict
            );
        }

        try {
            user = await UserService.createUserWithFreeSubscription({
                phoneNumber,
                firstName,
                lastName,
                email,
                age
            });
        } catch (error) {
            console.error("❌ Error creating user:", error);

            // Check for unique constraint violations
            if (error instanceof Error && error.message.includes('Unique constraint')) {
                return NextResponse.json(
                    { success: false, error: "User with this phone number or email already exists" },
                    { status: 409 }
                );
            }

            throw error;
        }


        // 🎟️ Generate session token
        const sessionToken = generateToken(user.id, phoneNumber);

        // 🍪 Set session cookie
        const cookieStore = await cookies();
        cookieStore.set("session-token", sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: "/",
        });

        return NextResponse.json(
            {
                success: true,
                message: "Authentication successful",
                token: sessionToken,
                user,
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("[POST /api/auth/register] ❌ Error:", error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0].message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    } finally {
        if (process.env.NODE_ENV === "production") {
            await prisma.$disconnect().catch(() => { });
        }
    }
}
