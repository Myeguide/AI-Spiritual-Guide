import { msg91EmailRequest } from '@/lib/msg91';

export class EmailError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 400
    ) {
        super(message);
        this.name = 'EmailError';
    }
}

// Template IDs from MSG91
const EMAIL_TEMPLATES = {
    SUBSCRIPTION_REMINDER: 'subscription_reminder',
    SUBSCRIPTION_EXPIRED: 'subscription_expired_4',
};

export class EmailService {
    /**
     * Send subscription expiry reminder email
     */
    static async sendSubscriptionExpiryReminder(
        email: string,
        userName: string,
        planName: string,
        expiryDate: Date,
        daysRemaining: number
    ): Promise<void> {
        try {
            const formattedDate = expiryDate.toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });

            await msg91EmailRequest({
                templateId: EMAIL_TEMPLATES.SUBSCRIPTION_REMINDER,
                to: [
                    {
                        email: email,
                        name: userName,
                    },
                ],
                variables: {
                    user_name: userName,
                    plan_name: planName,
                    expiry_date: formattedDate,
                    days_remaining: String(daysRemaining),
                },
            });

            console.log(`✅ Expiry reminder email sent to ${email}`);
        } catch (error: any) {
            console.error('❌ Email send error:', error);
            throw new EmailError(
                error.message || 'Failed to send email',
                'EMAIL_SEND_ERROR',
                500
            );
        }
    }

    /**
     * Send subscription expired notification
     */
    static async sendSubscriptionExpiredNotification(
        email: string,
        userName: string,
        planName: string
    ): Promise<void> {
        try {
            await msg91EmailRequest({
                templateId: EMAIL_TEMPLATES.SUBSCRIPTION_EXPIRED,
                to: [
                    {
                        email: email,
                        name: userName,
                    },
                ],
                variables: {
                    user_name: userName,
                    plan_name: planName,
                },
            });

            console.log(`✅ Expired notification email sent to ${email}`);
        } catch (error: any) {
            console.error('❌ Email send error:', error);
            throw new EmailError(
                error.message || 'Failed to send email',
                'EMAIL_SEND_ERROR',
                500
            );
        }
    }
}
