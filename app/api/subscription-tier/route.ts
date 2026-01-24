import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const tiers = await prisma.subscriptionTier.findMany({
            where: { type: { not: "free" } },
        });

        // Sort tiers in the desired order: onetime, monthly, yearly
        const sortOrder = ['one-time', 'premium-monthly', 'premium-yearly'];
        const sortedTiers = tiers.sort((a, b) => {
            const indexA = sortOrder.indexOf(a.type);
            const indexB = sortOrder.indexOf(b.type);

            // If type not in sortOrder, put it at the end
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;

            return indexA - indexB;
        });

        return NextResponse.json({ success: true, data: sortedTiers }, { status: 200 });
    } catch (error) {
        console.error("Error fetching priority tiers:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch priority tiers" },
            { status: 500 }
        );
    }
}
