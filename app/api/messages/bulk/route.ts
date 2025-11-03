// app/api/messages/bulk/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/generate-token";

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.split(" ")[1];

        if (!token) {
            return NextResponse.json(
                { error: "Unauthorized - No token provided" },
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
                { error: "Unauthorized - Invalid token" },
                { status: 401 }
            );
        }

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