import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const tiers = await prisma.priorityTier.findMany({
            orderBy: {
                id: "asc",
            },
        });
        console.log("got tiers", tiers)

        return NextResponse.json({ success: true, data: tiers }, { status: 200 });
    } catch (error) {
        console.error("Error fetching priority tiers:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch priority tiers" },
            { status: 500 }
        );
    }
}
