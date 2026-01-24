import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthMiddleware } from "@/app/middleware/middleware";

export async function POST(req: NextRequest) {
  try {
    const auth = AuthMiddleware(req);
    if ("error" in auth) {
      return NextResponse.json(auth, { status: auth.status });
    }
    const { userId } = auth;

    const { anonId } = await req.json();
    if (!anonId || typeof anonId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing anonId" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const threads = await tx.thread.updateMany({
        where: { anonId, userId: null },
        data: { userId, anonId: null },
      });

      const messages = await tx.message.updateMany({
        where: { anonId, userId: null },
        data: { userId, anonId: null },
      });

      return { threads: threads.count, messages: messages.count };
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    console.error("Claim guest chats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to claim guest chats" },
      { status: 500 }
    );
  }
}


