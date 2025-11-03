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
        const { threadId, createdAt, gte = true } = await req.json();

        // Validate required fields
        if (!threadId || !userId || !createdAt) {
            return NextResponse.json(
                { error: "Missing required fields: threadId, userId, or createdAt" },
                { status: 400 }
            );
        }

        // Verify user has access to this thread
        const thread = await prisma.thread.findFirst({
            where: {
                id: threadId,
                userId: userId,
            },
        });

        if (!thread) {
            return NextResponse.json(
                { error: "Thread not found or access denied" },
                { status: 404 }
            );
        }

        const targetDate = new Date(createdAt);

        // Build the where clause based on gte parameter
        const whereClause = {
            threadId,
            userId,
            createdAt: gte ? { gte: targetDate } : { gt: targetDate },
        };

        // First, get the messages that will be deleted to also delete their summaries
        const messagesToDelete = await prisma.message.findMany({
            where: whereClause,
            select: { id: true },
        });

        const messageIds = messagesToDelete.map((msg) => msg.id);

        // Use a transaction to ensure data consistency
        // const result = await prisma.$transaction(async (tx) => {
        //     // Delete message summaries first (due to foreign key constraints)
        //     if (messageIds.length > 0) {
        //         const deletedSummaries = await tx.messageSummary.deleteMany({
        //             where: {
        //                 messageId: { in: messageIds },
        //             },
        //         });
        //         console.log(`Deleted ${deletedSummaries.count} message summaries`);
        //     }

        //       // Delete the messages
        //       const deletedMessages = await tx.message.deleteMany({
        //         where: whereClause,
        //       });

        //       return {
        //         deletedMessages: deletedMessages.count,
        //         deletedSummaries: messageIds.length,
        //       };
        // });

        // Delete the messages
        const result = await prisma.$transaction(async (tx) => {
            const deletedMessages = await tx.message.deleteMany({
                where: whereClause,
            });

            return {
                deletedMessages: deletedMessages.count,
                deletedSummaries: messageIds.length,
            };
        })


        return NextResponse.json({
            success: true,
            deletedMessages: result.deletedMessages,
        });
    }

    catch (error: any) {
        console.error("❌ Error deleting trailing messages:", error);

        // Handle specific Prisma errors
        if (error.code === "P2025") {
            return NextResponse.json(
                { error: "Some records to delete do not exist" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: "Failed to delete trailing messages" },
            { status: 500 }
        );
    }
}