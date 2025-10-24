import { DatabaseError, SubscriptionStatus } from "@/types/payment";
import { prisma } from "../prisma";

export class SubscriptionService {
    /**
     * Creates a new subscription for a user
     * Automatically closes any existing ACTIVE or PENDING subscriptions
     */
    static async createSubscription(
        data: {
            name: string;
            id: string;
            type: string;
            totalRequests: number;
            price: string;
            validityDays: number;
            currency: string;
            description: string | null;
            features: string[];
        },
        userId: string
    ) {
        try {
            const now = new Date();
            const startDate = now;

            // Calculate end date based on validityDays
            const expiresAt = this.calculateEndDate(data.validityDays, data.type, now);

            console.log("Subscription dates:", { startDate, expiresAt });

            // Use transaction to handle previous subscription closure and new subscription creation
            const subscription = await prisma.$transaction(async (tx) => {
                // Check for existing active or pending subscriptions
                const existingSubscription = await tx.subscription.findFirst({
                    where: {
                        userId: userId,
                        status: {
                            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING]
                        },
                    }
                });

                // If there's an existing subscription, close it
                if (existingSubscription) {
                    await this.closeSubscription(tx, existingSubscription.id, now);
                    console.log("Closed previous subscription:", existingSubscription.id);
                }

                // Create new subscription
                const newSubscription = await tx.subscription.create({
                    data: {
                        userId: userId,
                        tierId: data.id,

                        // Request tracking
                        totalRequests: data.totalRequests,
                        requestsUsed: 0,

                        // Pricing
                        amount: data.price,
                        currency: data.currency || 'INR',

                        // Plan info
                        planType: data.type,

                        // Dates
                        startDate,
                        expiresAt,

                        // Status
                        status: data.type === 'free' ? SubscriptionStatus.ACTIVE : SubscriptionStatus.PENDING,
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                            }
                        },
                        tier: true
                    }
                });

                // Update user's activeSubscriptionId
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        activeSubscriptionId: newSubscription.id
                    }
                });

                return newSubscription;
            });

            console.log("Created new subscription:", subscription);

            return subscription;
        } catch (error) {
            console.error('Create subscription error:', error);
            throw new DatabaseError('Failed to create subscription', error);
        }
    }

    /**
     * Activates a pending subscription (typically after successful payment)
     */
    static async activateSubscription(subscriptionId: string) {
        try {
            const subscription = await prisma.subscription.update({
                where: { id: subscriptionId },
                data: {
                    status: SubscriptionStatus.ACTIVE,
                },
                include: {
                    user: true,
                    tier: true
                }
            });

            console.log("Activated subscription:", subscriptionId);
            return subscription;
        } catch (error) {
            console.error('Activate subscription error:', error);
            throw new DatabaseError('Failed to activate subscription', error);
        }
    }

    /**
     * Closes an existing subscription (marks as EXPIRED or CANCELLED)
     */
    private static async closeSubscription(
        tx: any, // Prisma transaction client
        subscriptionId: string,
        closedAt: Date,
        status: SubscriptionStatus = SubscriptionStatus.EXPIRED
    ) {
        return await tx.subscription.update({
            where: { id: subscriptionId },
            data: {
                status: status,
                cancelledAt: closedAt,
                expiresAt: closedAt,
            }
        });
    }

    /**
     * Calculates end date based on validity days and plan type
     */
    private static calculateEndDate(
        validityDays: number,
        planType: string,
        startDate: Date
    ): Date | null {
        if (validityDays === 0 || planType === 'free') {
            // Free plan or lifetime plan never expires
            return null;
        }

        // Calculate expiry based on validityDays
        return new Date(startDate.getTime() + validityDays * 24 * 60 * 60 * 1000);
    }

    /**
     * Checks if a subscription has expired
     */
    static isSubscriptionExpired(subscription: { expiresAt: Date | null, requestsUsed: number, totalRequests: number }): boolean {
        const now = new Date();

        // Check if requests are exhausted
        if (subscription.requestsUsed >= subscription.totalRequests) {
            return true;
        }

        // Check if date has expired (null expiresAt means lifetime/free)
        if (subscription.expiresAt && subscription.expiresAt < now) {
            return true;
        }

        return false;
    }

    static isSubscriptionExpiredByDate(subscription: { expiresAt: Date | null }): boolean {
        // null expiresAt means lifetime/no expiry
        if (!subscription.expiresAt) {
            return false;
        }

        const now = new Date();
        return subscription.expiresAt < now;
    }

    /**
     * Checks if subscription requests are exhausted
     */
    static isRequestsExhausted(subscription: { requestsUsed: number, totalRequests: number }): boolean {
        return subscription.requestsUsed >= subscription.totalRequests;
    }

    /**
     * Gets user's active subscription
     */
    static async getActiveSubscription(userId: string) {
        try {
            const subscription = await prisma.subscription.findFirst({
                where: {
                    userId: userId,
                    status: SubscriptionStatus.ACTIVE,
                },
                include: {
                    tier: true
                }
            });

            return subscription; // Return as-is, don't auto-expire here
        } catch (error) {
            console.error('Get active subscription error:', error);
            throw new DatabaseError('Failed to get active subscription', error);
        }
    }
    /**
     * Increments request usage for a subscription
     */
    static async incrementRequestUsage(subscriptionId: string) {
        try {
            const subscription = await prisma.subscription.update({
                where: { id: subscriptionId },
                data: {
                    requestsUsed: { increment: 1 }
                }
            });

            // Check if requests are now exhausted
            if (subscription.requestsUsed >= subscription.totalRequests) {
                await prisma.subscription.update({
                    where: { id: subscriptionId },
                    data: {
                        status: SubscriptionStatus.EXPIRED,
                        expiresAt: new Date()
                    }
                });
            }

            return subscription;
        } catch (error) {
            console.error('Increment request usage error:', error);
            throw new DatabaseError('Failed to increment request usage', error);
        }
    }

    /**
     * Cancels a subscription (user-initiated)
     */
    static async cancelSubscription(subscriptionId: string) {
        try {
            const subscription = await prisma.subscription.update({
                where: { id: subscriptionId },
                data: {
                    status: SubscriptionStatus.CANCELLED,
                    cancelledAt: new Date(),
                },
                include: {
                    user: true,
                    tier: true
                }
            });

            console.log("Cancelled subscription:", subscriptionId);
            return subscription;
        } catch (error) {
            console.error('Cancel subscription error:', error);
            throw new DatabaseError('Failed to cancel subscription', error);
        }
    }
}