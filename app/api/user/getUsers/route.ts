import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                age: true,
                dob: true,
                phoneNumber: true,
                createdAt: true,
                updatedAt: true,
                activeSubscriptionId: true,
                requestsUsedLifetime: true,
                whatsappEnabled: true,
                Subscription: {
                    where: {
                        status: "ACTIVE",
                    },
                    select: {
                        id: true,
                        planType: true,
                        status: true,
                        expiresAt: true,
                        totalRequests: true,
                        requestsUsed: true,
                    },
                    take: 1,
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Transform data to include subscriptionType and usage stats
        const transformedUsers = users.map((user) => {
            const activeSubscription = user.Subscription[0];

            return {
                ...user,
                dob: user.dob?.toISOString() ?? null,
                createdAt: user.createdAt.toISOString(),
                updatedAt: user.updatedAt.toISOString(),
                subscriptionType: activeSubscription?.planType?.toLowerCase() ?? "free",
                // Per-subscription usage
                questionsAsked: activeSubscription?.requestsUsed ?? 0,
                totalRequests: activeSubscription?.totalRequests ?? 0,
            };
        });

        return NextResponse.json({ success: true, status: 200, users: transformedUsers });
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 }
        );
    }
}