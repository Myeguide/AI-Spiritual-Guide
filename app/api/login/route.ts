import { generateToken } from "@/lib/generate-token";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const { phoneNumber } = body as { phoneNumber: string };

    // 📞 E.164 phone format validation
    const phoneRegex = /^\+?[1-9]\d{7,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
        return NextResponse.json(
            { success: false, error: "Invalid phone number format" },
            { status: 400 }
        );
    }

    const user = await prisma.user.findUnique({
        where: { phoneNumber: phoneNumber },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
            age: true,
        },
    });

    if (!user?.id) {
        return NextResponse.json(
            { success: false, error: "User not found" },
            { status: 404 }
        );
    }

    const sessionToken = generateToken(user.id, phoneNumber);

    // Create session & set cookie
    const cookieStore = await cookies();
    cookieStore.set("session-token", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/"
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
}