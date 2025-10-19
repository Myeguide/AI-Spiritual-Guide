import { PrismaClient, SubscriptionStatus, PaymentStatus } from '@/lib/generated/prisma';
import { DatabaseError } from '@/types/payment';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ============================================
// SUBSCRIPTION QUERIES
// ============================================

export async function createSubscription(data: {
    userId: string;  // Changed from number to string
    planType: string;
    amount: number;
    currency: string;
}) {
    try {
        return await prisma.subscription.create({
            data: {
                userId: data.userId,
                planType: data.planType,
                amount: data.amount,
                currency: data.currency,
                status: SubscriptionStatus.PENDING,
            },
        });
    } catch (error) {
        throw new DatabaseError('Failed to create subscription', error);
    }
}

export async function updateSubscription(
    id: string,
    data: {
        status?: SubscriptionStatus;
        razorpaySubscriptionId?: string;
        razorpayPlanId?: string;
        razorpayCustomerId?: string;
        startDate?: Date;
        endDate?: Date;
        nextBillingDate?: Date;
        cancelledAt?: Date;
    }
) {
    try {
        return await prisma.subscription.update({
            where: { id },
            data,
        });
    } catch (error) {
        throw new DatabaseError('Failed to update subscription', error);
    }
}

export async function getSubscriptionById(id: string) {
    try {
        return await prisma.subscription.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    } catch (error) {
        throw new DatabaseError('Failed to get subscription', error);
    }
}

export async function getSubscriptionByRazorpayId(razorpayId: string) {
    try {
        return await prisma.subscription.findFirst({
            where: { razorpaySubscriptionId: razorpayId },
        });
    } catch (error) {
        throw new DatabaseError('Failed to get subscription by Razorpay ID', error);
    }
}

export async function getUserActiveSubscription(userId: string) {
    try {
        return await prisma.subscription.findFirst({
            where: {
                userId,
                status: SubscriptionStatus.ACTIVE,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    } catch (error) {
        throw new DatabaseError('Failed to get user active subscription', error);
    }
}

export async function getUserSubscriptions(userId: string) {  // Changed from number to string
    try {
        return await prisma.subscription.findMany({
            where: { userId },
            orderBy: {
                createdAt: 'desc',
            },
        });
    } catch (error) {
        throw new DatabaseError('Failed to get user subscriptions', error);
    }
}

// ============================================
// PAYMENT QUERIES
// ============================================

export async function createPayment(data: {
    userId: string;  // Changed from number to string
    subscriptionId?: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    description?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notes?: Record<string, any>;
}) {
    try {
        return await prisma.payment.create({
            data: {
                userId: data.userId,
                subscriptionId: data.subscriptionId || "",
                razorpayOrderId: data.razorpayOrderId,
                amount: data.amount,
                currency: data.currency,
                status: PaymentStatus.CREATED,
                description: data.description || null,
                notes: data.notes ?? undefined,
            },
        });
    } catch (error) {
        throw new DatabaseError('Failed to create payment', error);
    }
}

export async function updatePayment(
    orderId: string,
    data: {
        razorpayPaymentId?: string;
        razorpaySignature?: string;
        status: PaymentStatus;
        method?: string;
    }
) {
    try {
        return await prisma.payment.updateMany({
            where: { razorpayOrderId: orderId },
            data,
        });
    } catch (error) {
        throw new DatabaseError('Failed to update payment', error);
    }
}

export async function getPaymentByOrderId(orderId: string) {
    try {
        return await prisma.payment.findFirst({
            where: { razorpayOrderId: orderId },
        });
    } catch (error) {
        throw new DatabaseError('Failed to get payment', error);
    }
}

export async function getPaymentByPaymentId(paymentId: string) {
    try {
        return await prisma.payment.findUnique({
            where: { razorpayPaymentId: paymentId },
        });
    } catch (error) {
        throw new DatabaseError('Failed to get payment by payment ID', error);
    }
}

export async function getUserPayments(userId: string) {  // Changed from number to string
    try {
        return await prisma.payment.findMany({
            where: { userId },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                subscription: {
                    select: {
                        planType: true,
                    },
                },
            },
        });
    } catch (error) {
        throw new DatabaseError('Failed to get user payments', error);
    }
}

// ============================================
// WEBHOOK QUERIES (Optional for testing)
// ============================================

export async function createWebhookEvent(data: {
    eventId: string;
    eventType: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: Record<string, any>;
}) {
    try {
        return await prisma.webhookEvent.create({
            data: {
                eventId: data.eventId,
                eventType: data.eventType,
                payload: data.payload,
            },
        });
    } catch (error) {
        // If unique constraint fails, event already exists
        if (error instanceof Error && error.message.includes('Unique constraint')) {
            throw new DatabaseError('Webhook event already processed', error);
        }
        throw new DatabaseError('Failed to create webhook event', error);
    }
}

export async function markWebhookAsProcessed(eventId: string) {
    try {
        await prisma.webhookEvent.update({
            where: { eventId },
            data: {
                processed: true,
                processedAt: new Date(),
            },
        });
    } catch (error) {
        throw new DatabaseError('Failed to mark webhook as processed', error);
    }
}

export async function isWebhookProcessed(eventId: string): Promise<boolean> {
    try {
        const event = await prisma.webhookEvent.findUnique({
            where: { eventId },
            select: { processed: true },
        });
        return event?.processed || false;
    } catch {
        return false;
    }
}

// ============================================
// USER QUERIES
// ============================================

export async function getUserById(id: string) {  // Changed from number to string
    try {
        return await prisma.user.findUnique({
            where: { id },
        });
    } catch (error) {
        throw new DatabaseError('Failed to get user', error);
    }
}

export async function getUserByEmail(email: string) {
    try {
        return await prisma.user.findUnique({
            where: { email },
        });
    } catch (error) {
        throw new DatabaseError('Failed to get user by email', error);
    }
}