import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/generate-token";

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.split(" ")[1] as string;

        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized - No token provided' },
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
                { error: 'Unauthorized - Invalid token' },
                { status: 401 }
            );
        }

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
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.split(" ")[1] as string;

        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized - No token provided' },
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
                { error: 'Unauthorized - Invalid token' },
                { status: 401 }
            );
        }

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