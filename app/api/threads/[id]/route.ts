import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/generate-token";

function getIdentity(req: NextRequest): { userId: string | null; anonId: string | null } {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];
    const verified = token ? verifyToken(token) : null;
    const userId = verified?.userId || null;
    const anonId = !userId ? (req.headers.get("x-anonymous-id")?.trim() || null) : null;
    return { userId, anonId };
}

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { userId, anonId } = getIdentity(req);
        if (!userId && !anonId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Await params before accessing id
        const { id } = await context.params;
        const { title } = await req.json();

        const thread = await prisma.thread.update({
            where: { id },
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
        const { userId, anonId } = getIdentity(req);
        if (!userId && !anonId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Await params before accessing id
        const { id } = await context.params;

        // Verify ownership
        const thread = await prisma.thread.findUnique({
            where: { id },
            select: { userId: true, anonId: true },
        });

        if (!thread) {
            return NextResponse.json({ error: "Thread not found" }, { status: 404 });
        }

        const allowed = userId ? thread.userId === userId : (thread.userId === null && thread.anonId === anonId);
        if (!allowed) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.thread.delete({
            where: { id },
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