import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthMiddleware } from "@/app/middleware/middleware";

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const auth = AuthMiddleware(req);

        if ("error" in auth) {
            return NextResponse.json(auth, { status: auth.status });
        }
        const { userId } = auth;

        // Await params before accessing id
        const { id } = await context.params;
        const { title } = await req.json();

        const thread = await prisma.thread.update({
            where: { id, userId },
            data: { title, updatedAt: new Date() },
        });

        return NextResponse.json({ success: true, thread });
    } catch (error) {
        console.error("❌ Error updating thread:", error);
        return NextResponse.json(
            { error: "Failed to update thread" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const auth = AuthMiddleware(req);

        if ("error" in auth) {
            return NextResponse.json(auth, { status: auth.status });
        }
        const { userId } = auth;

        // Await params before accessing id
        const { id } = await context.params;

        await prisma.thread.delete({
            where: { id, userId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("❌ Error deleting thread:", error);
        return NextResponse.json(
            { error: "Failed to delete thread" },
            { status: 500 }
        );
    }
}