import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthMiddleware } from "@/app/middleware/middleware";

/**
 * POST /api/threads
 * Create a new chat thread
 */
export async function POST(req: NextRequest) {
    try {
        const auth = AuthMiddleware(req);

        if ("error" in auth) {
            return NextResponse.json(auth, { status: auth.status });
        }
        const { userId } = auth;

        const { threadId } = await req.json();
        const thread = await prisma.thread.create({
            data: {
                id: threadId,
                userId,
                title: "",
                createdAt: new Date(),
                updatedAt: new Date(),
                lastMessageAt: new Date(),
                conversationSummary: "",
            },
        });
        return NextResponse.json({
            success: true,
            thread
        }, { status: 201 });
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { success: false, error: "Failed to create thread" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/threads
 * Get all threads for the authenticated user
 */
export async function GET(req: NextRequest) {
    try {
        const auth = AuthMiddleware(req);

        if ("error" in auth) {
            return NextResponse.json(auth, { status: auth.status });
        }
        const { userId } = auth;

        // Optimized query with pagination and selective fields
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        // Use Promise.all for parallel queries (faster)
        const [threads, totalCount] = await Promise.all([
            prisma.thread.findMany({
                where: {
                    userId,
                },
                select: {
                    id: true,
                    title: true,
                    createdAt: true,
                    updatedAt: true,
                    lastMessageAt: true,
                    _count: {
                        select: {
                            messages: true,
                        },
                    },
                },
                orderBy: {
                    updatedAt: "desc",
                },
                take: limit,
                skip: offset,
            }),
            // Get total count for pagination
            prisma.thread.count({
                where: {
                    userId,
                },
            }),
        ]);
        return NextResponse.json({
            success: true,
            threads,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + threads.length < totalCount,
            },
        });

    } catch (error) {
        console.error("[Threads] ❌ Error fetching threads:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch threads" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/threads
 * Delete a thread and all its messages
 */
export async function DELETE(req: NextRequest) {
    try {
        const auth = AuthMiddleware(req);

        if ("error" in auth) {
            return NextResponse.json(auth, { status: auth.status });
        }
        const { userId } = auth;

        const { searchParams } = new URL(req.url);
        const threadId = searchParams.get("threadId");

        if (!threadId) {
            return NextResponse.json(
                { success: false, error: "Missing threadId" },
                { status: 400 }
            );
        }

        // Verify thread belongs to user before deleting
        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
            select: { userId: true },
        });

        if (!thread) {
            return NextResponse.json(
                { success: false, error: "Thread not found" },
                { status: 404 }
            );
        }

        if (thread.userId !== userId) {
            return NextResponse.json(
                { success: false, error: "Forbidden" },
                { status: 403 }
            );
        }

        // Delete thread (cascades to messages due to schema)
        await prisma.thread.delete({
            where: { id: threadId },
        });

        return NextResponse.json({
            success: true,
            message: "Thread deleted successfully",
        });

    } catch (error) {
        console.error("[Threads] ❌ Error deleting thread:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete thread" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/threads
 * Update thread title
 */
export async function PATCH(req: NextRequest) {
    try {
        const auth = AuthMiddleware(req);

        if ("error" in auth) {
            return NextResponse.json(auth, { status: auth.status });
        }
        const { userId } = auth;

        const { threadId, title } = await req.json();

        if (!threadId || !title) {
            return NextResponse.json(
                { success: false, error: "Missing threadId or title" },
                { status: 400 }
            );
        }

        // Verify ownership and update in one query
        const thread = await prisma.thread.updateMany({
            where: {
                id: threadId,
                userId,
            },
            data: {
                title,
            },
        });

        if (thread.count === 0) {
            return NextResponse.json(
                { success: false, error: "Thread not found or unauthorized" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Thread updated successfully",
        });

    } catch (error) {
        console.error("[Threads] ❌ Error updating thread:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update thread" },
            { status: 500 }
        );
    }
}