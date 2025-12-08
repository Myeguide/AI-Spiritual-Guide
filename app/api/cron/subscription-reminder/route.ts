import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/services/email.service';

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

        // Find subscriptions expiring in exactly 5 days that haven't received reminder
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
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                tier: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        console.log(`Found ${subscriptionsToRemind.length} subscriptions expiring in 5 days`);
        results.remindersProcessed = subscriptionsToRemind.length;

        // Send reminder emails
        for (const subscription of subscriptionsToRemind) {
            try {
                const userName = `${subscription.user.firstName} ${subscription.user.lastName}`.trim();

                await EmailService.sendSubscriptionExpiryReminder(
                    subscription.user.email,
                    userName || 'Valued User',
                    subscription.tier.name,
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
                        userId: subscription.user.id,
                        email: subscription.user.email,
                        type: 'subscription_reminder',
                        subject: `Your ${subscription.tier.name} subscription expires in 5 days`,
                        status: 'sent',
                        metadata: {
                            subscriptionId: subscription.id,
                            daysRemaining: 5,
                        },
                    },
                });

                results.remindersSent++;
                console.log(`Reminder sent to ${subscription.user.email}`);
            } catch (error: any) {
                results.remindersFailed++;
                results.errors.push(`Failed to send reminder to ${subscription.user.email}: ${error.message}`);
                console.error(`Failed to send reminder to ${subscription.user.email}:`, error);
            }
        }

        // === PART 2: Send expired notifications ===
        const now = new Date();

        // Find subscriptions that just expired (within last 24 hours) and haven't received notification
        const expiredSubscriptions = await prisma.subscription.findMany({
            where: {
                status: 'ACTIVE', // Still marked active but past expiry
                planType: { not: 'free' },
                expiresAt: {
                    lt: now,
                    gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
                },
                expiredEmailSent: false,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                tier: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        console.log(`Found ${expiredSubscriptions.length} recently expired subscriptions`);
        results.expiredProcessed = expiredSubscriptions.length;

        for (const subscription of expiredSubscriptions) {
            try {
                const userName = `${subscription.user.firstName} ${subscription.user.lastName}`.trim();

                await EmailService.sendSubscriptionExpiredNotification(
                    subscription.user.email,
                    userName || 'Valued User',
                    subscription.tier.name
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
                        userId: subscription.user.id,
                        email: subscription.user.email,
                        type: 'subscription_expired',
                        subject: `Your ${subscription.tier.name} subscription has expired`,
                        status: 'sent',
                        metadata: {
                            subscriptionId: subscription.id,
                        },
                    },
                });

                results.expiredNotificationsSent++;
                console.log(`Expired notification sent to ${subscription.user.email}`);
            } catch (error: any) {
                results.errors.push(`Failed to send expired notification to ${subscription.user.email}: ${error.message}`);
                console.error(`Failed to send expired notification:`, error);
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