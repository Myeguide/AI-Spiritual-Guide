import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/services/email.service';

// Ensure this route always runs server-side and is never cached.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(req: NextRequest): boolean {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.warn('CRON_SECRET not set - allowing request in development');
        return process.env.NODE_ENV === 'development';
    }

    return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(req: NextRequest) {
    try {
        // Verify the request is from authorized source
        if (!verifyCronSecret(req)) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const results = {
            remindersProcessed: 0,
            remindersSent: 0,
            remindersFailed: 0,
            expiredProcessed: 0,
            expiredNotificationsSent: 0,
            errors: [] as string[],
        };

        // === PART 1: Send 5-day reminder emails ===
        const fiveDaysFromNow = new Date();
        fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

        // Set time range for "expires in 5 days" (the entire day)
        const startOfDay = new Date(fiveDaysFromNow);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(fiveDaysFromNow);
        endOfDay.setHours(23, 59, 59, 999);

        // Find subscriptions expiring in exactly 5 days that haven't received reminder.
        // Important: We intentionally do NOT include relational fields (user/tier) here.
        // In production, it's possible to have orphaned rows (relationMode="prisma"),
        // and Prisma will throw "Inconsistent query result" if a required relation resolves to null.
        const subscriptionsToRemind = await prisma.subscription.findMany({
            where: {
                status: 'ACTIVE',
                planType: { not: 'free' }, // Exclude free tier
                expiresAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                reminderSentAt: null, // Haven't sent reminder yet
            },
            select: {
                id: true,
                userId: true,
                tierId: true,
                expiresAt: true,
            },
        });

        console.log(`Found ${subscriptionsToRemind.length} subscriptions expiring in 5 days`);
        results.remindersProcessed = subscriptionsToRemind.length;

        // Send reminder emails
        for (const subscription of subscriptionsToRemind) {
            try {
                const user = await prisma.user.findUnique({
                    where: { id: subscription.userId },
                    select: { id: true, email: true, firstName: true, lastName: true },
                });

                const tier = await prisma.subscriptionTier.findUnique({
                    where: { id: subscription.tierId },
                    select: { name: true },
                });

                if (!user || !tier) {
                    results.remindersFailed++;
                    results.errors.push(
                        `Skipping reminder for subscription ${subscription.id}: missing ${!user ? 'user' : 'tier'} record`
                    );
                    console.warn(
                        `Skipping reminder for subscription ${subscription.id}:`,
                        { hasUser: !!user, hasTier: !!tier }
                    );
                    continue;
                }

                const userEmail = user.email;
                const userName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();

                await EmailService.sendSubscriptionExpiryReminder(
                    userEmail,
                    userName || 'Valued User',
                    tier.name,
                    subscription.expiresAt!,
                    5
                );

                // Mark reminder as sent
                await prisma.subscription.update({
                    where: { id: subscription.id },
                    data: { reminderSentAt: new Date() },
                });

                // Log the email
                await prisma.emailLog.create({
                    data: {
                        userId: user.id,
                        email: userEmail,
                        type: 'subscription_reminder',
                        subject: `Your ${tier.name} subscription expires in 5 days`,
                        status: 'sent',
                        metadata: {
                            subscriptionId: subscription.id,
                            daysRemaining: 5,
                        },
                    },
                });

                results.remindersSent++;
                console.log(`Reminder sent to ${userEmail}`);
            } catch (error: any) {
                results.remindersFailed++;
                results.errors.push(`Failed to send reminder for subscription ${subscription.id}: ${error.message}`);
                console.error(`Failed to send reminder for subscription ${subscription.id}:`, error);
            }
        }

        // === PART 2: Send expired notifications ===
        const now = new Date();

        // Find subscriptions that are overdue and haven't received notification.
        // We intentionally do not limit this to the "last 24 hours" so we don't miss notifications
        // if the cron job was down for a while.
        const expiredSubscriptions = await prisma.subscription.findMany({
            where: {
                status: 'ACTIVE', // Still marked active but past expiry
                planType: { not: 'free' },
                expiresAt: {
                    lt: now,
                },
                expiredEmailSent: false,
            },
            select: {
                id: true,
                userId: true,
                tierId: true,
            },
        });

        console.log(`Found ${expiredSubscriptions.length} recently expired subscriptions`);
        results.expiredProcessed = expiredSubscriptions.length;

        for (const subscription of expiredSubscriptions) {
            try {
                const user = await prisma.user.findUnique({
                    where: { id: subscription.userId },
                    select: { id: true, email: true, firstName: true, lastName: true },
                });

                const tier = await prisma.subscriptionTier.findUnique({
                    where: { id: subscription.tierId },
                    select: { name: true },
                });

                if (!user || !tier) {
                    results.errors.push(
                        `Skipping expired notification for subscription ${subscription.id}: missing ${!user ? 'user' : 'tier'} record`
                    );
                    console.warn(
                        `Skipping expired notification for subscription ${subscription.id}:`,
                        { hasUser: !!user, hasTier: !!tier }
                    );
                    continue;
                }

                const userEmail = user.email;
                const userName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();

                await EmailService.sendSubscriptionExpiredNotification(
                    userEmail,
                    userName || 'Valued User',
                    tier.name
                );

                // Mark subscription as expired and notification sent
                await prisma.subscription.update({
                    where: { id: subscription.id },
                    data: {
                        status: 'EXPIRED',
                        expiredEmailSent: true,
                    },
                });

                // Log the email
                await prisma.emailLog.create({
                    data: {
                        userId: user.id,
                        email: userEmail,
                        type: 'subscription_expired',
                        subject: `Your ${tier.name} subscription has expired`,
                        status: 'sent',
                        metadata: {
                            subscriptionId: subscription.id,
                        },
                    },
                });

                results.expiredNotificationsSent++;
                console.log(`Expired notification sent to ${userEmail}`);
            } catch (error: any) {
                results.errors.push(`Failed to send expired notification for subscription ${subscription.id}: ${error.message}`);
                console.error(`Failed to send expired notification for subscription ${subscription.id}:`, error);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Subscription reminder job completed',
            results,
            timestamp: new Date().toISOString(),
        });

    } catch (error: any) {
        console.error('Cron job error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Cron job failed',
            },
            { status: 500 }
        );
    }
}