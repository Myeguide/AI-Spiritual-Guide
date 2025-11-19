import { NextRequest, NextResponse } from "next/server";
import { OTPError, OTPService } from "@/lib/services/otp.service";
import { UserService } from "@/lib/services/user.service";
import { registerSchema } from "@/lib/validators/auth.validator";
import { cookies } from "next/headers";
import { generateToken } from "@/lib/generate-token";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { genSaltSync, hashSync } from "bcrypt-ts"
import { calculateAge } from "@/utils/date-utils";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validatedData = registerSchema.parse(body);
        const { phoneNumber, code, firstName, lastName, email, password, dob } = validatedData;

        // 🔐 Verify OTP
        try {
            await OTPService.verifyOTP(phoneNumber, code);
        } catch (error) {
            if (error instanceof OTPError) {
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: error.statusCode }
                );
            }
            return NextResponse.json(
                { success: false, error: "Invalid or expired OTP" },
                { status: 401 }
            );
        }

        const salt = genSaltSync(10);
        const hashedPassword = hashSync(password, salt);

        let user = await UserService.getUserByPhoneOrEmail(phoneNumber, email);
        if (user) {
            return NextResponse.json(
                {
                    success: false,
                    error: "User already exists. Please use login instead of registration."
                },
                { status: 409 }
            );
        }

        const age = calculateAge(dob);

        try {
            user = await UserService.createUserWithFreeSubscription({
                phoneNumber,
                firstName,
                lastName,
                email,
                age,
                dob,
                password: hashedPassword,
            });
        } catch (error) {
            console.error("❌ Error creating user:", error);

            if (error instanceof Error && error.message.includes("Unique constraint")) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "User with this phone number or email already exists",
                    },
                    { status: 409 }
                );
            }

            throw error;
        }

        const sessionToken = generateToken(user.id, user.age, phoneNumber);

        const cookieStore = await cookies();
        cookieStore.set("session-token", sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60,
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
    }
}
