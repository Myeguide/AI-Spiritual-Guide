import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthMiddleware } from "@/app/middleware/middleware";

export async function DELETE(req: NextRequest) {
    try {
        const auth = AuthMiddleware(req);

        if ("error" in auth) {
            return NextResponse.json(auth, { status: auth.status });
        }
        const { userId } = auth;

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