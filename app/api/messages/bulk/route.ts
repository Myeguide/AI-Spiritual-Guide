// app/api/messages/bulk/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthMiddleware } from "@/app/middleware/middleware";

export async function GET(req: NextRequest) {
    try {
        const auth = AuthMiddleware(req);

        if ("error" in auth) {
            return NextResponse.json(auth, { status: auth.status });
        }
        const { userId } = auth;

        // Get all threads for this user
        const threads = await prisma.thread.findMany({
            where: { userId },
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