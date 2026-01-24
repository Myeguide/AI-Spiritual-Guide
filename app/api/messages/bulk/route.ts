// app/api/messages/bulk/route.ts
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

export async function GET(req: NextRequest) {
    try {
        const { userId, anonId } = getIdentity(req);
        if (!userId && !anonId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get all threads for this user
        const threads = await prisma.thread.findMany({
            where: userId ? { userId } : { anonId, userId: null },
            select: { id: true },
        });

        const threadIds = threads.map((t) => t.id);

        // Fetch ALL messages for ALL threads in ONE query
        const messages = await prisma.message.findMany({
            where: {
                threadId: { in: threadIds },
            },
            orderBy: { createdAt: "asc" },
        });

        // Group messages by threadId for easier processing
        const messagesByThread = messages.reduce((acc: any, msg) => {
            if (!acc[msg.threadId]) {
                acc[msg.threadId] = [];
            }
            acc[msg.threadId].push(msg);
            return acc;
        }, {});

        return NextResponse.json({
            success: true,
            messagesByThread,
            totalMessages: messages.length,
        });
    } catch (error) {
        console.error("Error fetching bulk messages:", error);
        return NextResponse.json(
            { error: "Failed to fetch messages" },
            { status: 500 }
        );
    }
}