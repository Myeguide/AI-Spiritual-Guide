import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/generate-token";

export async function DELETE(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.split(" ")[1] as string;

        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized - No token provided' },
                { status: 401 }
            );
        }

        const userId = verifyToken(token);
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Invalid token' },
                { status: 401 }
            );
        }
        await prisma.thread.deleteMany({
            where: { userId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("❌ Error deleting all threads:", error);
        return NextResponse.json(
            { error: "Failed to delete all threads" },
            { status: 500 }
        );
    }
}