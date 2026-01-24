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

/*
 * POST /api/messages
 * Create a new message in a thread
*/
export async function POST(req: NextRequest) {
    try {
        const { userId, anonId } = getIdentity(req);
        if (!userId && !anonId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { threadId, message } = await req.json();
        // Validate required fields
        if (!threadId || !message?.id) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Verify user owns this thread (security check)
        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
            select: { userId: true, anonId: true },
        });

        if (!thread) {
            return NextResponse.json(
                { success: false, error: "Thread not found" },
                { status: 404 }
            );
        }

        const allowed = userId ? thread.userId === userId : (thread.userId === null && thread.anonId === anonId);
        if (!allowed) {
            return NextResponse.json(
                { success: false, error: "Access denied" },
                { status: 403 }
            );
        }

        // Check if message already exists (prevent duplicates)
        const existingMessage = await prisma.message.findUnique({
            where: { id: message.id },
        });

        if (existingMessage) {
            return NextResponse.json({
                success: true,
                message: existingMessage,
                alreadyExists: true,
            });
        }

        // save message to DB
        const savedMessage = await prisma.message.create({
            data: {
                id: message.id,
                threadId,
                ...(userId ? { userId } : { anonId }),
                content: message.content,
                parts: message.parts,
                role: message.role,
                createdAt: message.createdAt || new Date(),
            }
        })

        // udpate thread's lastMessageAt
        await prisma.thread.update({
            where: {
                id: threadId,
            },
            data: {
                lastMessageAt: message.createdAt || new Date()
            }
        })

        return NextResponse.json({
            success: true,
            message: savedMessage,
        }, { status: 201 })
    }

    catch (error: any) {
        console.log(error);

        // Handle specific Prisma errors
        if (error.code === "P2002") {
            // Unique constraint violation (duplicate message ID)
            return NextResponse.json(
                { success: false, error: "Message already exists" },
                { status: 409 }
            );
        }

        if (error.code === "P2003") {
            // Foreign key constraint failed
            return NextResponse.json(
                { success: false, error: "Invalid threadId or userId" },
                { status: 400 }
            );
        }

        if (error.code === "P2025") {
            // Record not found
            return NextResponse.json(
                { success: false, error: "Thread not found" },
                { status: 404 }
            );
        }
        return NextResponse.json(
            {
                success: false,
                error: "Failed to save message",
                details: process.env.NODE_ENV === "development" ? error.message : undefined
            },
            { status: 500 }
        );
    }
}


/**
 * GET /api/messages?threadId=xxx
 * Get all messages for a thread
 */
export async function GET(req: NextRequest) {
    try {
        const { userId, anonId } = getIdentity(req);
        if (!userId && !anonId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const threadId = searchParams.get("threadId");
        if (!threadId) {
            return NextResponse.json(
                { success: false, error: "Missing threadId" },
                { status: 400 }
            );
        }

        // Verify user owns this thread
        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
            select: { userId: true, anonId: true },
        });

        if (!thread) {
            return NextResponse.json(
                { success: false, error: "Thread not found" },
                { status: 404 }
            );
        }

        const allowed = userId ? thread.userId === userId : (thread.userId === null && thread.anonId === anonId);
        if (!allowed) {
            return NextResponse.json(
                { success: false, error: "Access denied" },
                { status: 403 }
            );
        }

        const messages = await prisma.message.findMany({
            where: {
                threadId,
                ...(userId ? { userId } : { anonId }),
            },
            select: {
                id: true,
                threadId: true,
                role: true,
                content: true,
                parts: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: "asc",
            },
        });
        return NextResponse.json({
            success: true,
            messages,
        });
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch messages",
                details: process.env.NODE_ENV === "development"
                    ? (error instanceof Error ? error.message : "Unknown error")
                    : undefined
            },
            { status: 500 }
        );
    }
}