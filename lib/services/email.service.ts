import { MSG91_CONFIG, msg91EmailRequest } from '@/lib/msg91';

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

interface EmailRecipient {
    to: { email: string; name?: string }[];
    variables?: Record<string, string>;
}

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
                domain: MSG91_CONFIG.emailDomain,
                from: {
                    email: MSG91_CONFIG.emailFrom,
                    name: MSG91_CONFIG.emailFromName,
                },
                to: [
                    {
                        email: email,
                        name: userName,
                    },
                ],
                subject: `⏰ Your ${planName} subscription expires in ${daysRemaining} days`,
                // You can use HTML template or plain text
                htmlContent: this.getExpiryReminderHTML(userName, planName, formattedDate, daysRemaining),
            });

            console.log(`Expiry reminder email sent to ${email}`);
        } catch (error: any) {
            console.error('Email send error:', error);
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
                domain: MSG91_CONFIG.emailDomain,
                from: {
                    email: MSG91_CONFIG.emailFrom,
                    name: MSG91_CONFIG.emailFromName,
                },
                to: [
                    {
                        email: email,
                        name: userName,
                    },
                ],
                subject: `Your ${planName} subscription has expired`,
                htmlContent: this.getExpiredNotificationHTML(userName, planName),
            });

            console.log(`Expired notification email sent to ${email}`);
        } catch (error: any) {
            console.error('Email send error:', error);
            throw new EmailError(
                error.message || 'Failed to send email',
                'EMAIL_SEND_ERROR',
                500
            );
        }
    }

    /**
     * HTML template for expiry reminder
     */
    private static getExpiryReminderHTML(
        userName: string,
        planName: string,
        expiryDate: string,
        daysRemaining: number
    ): string {
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Expiry Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🙏 EternalGuide</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Your Spiritual Companion</p>
      </td>
    </tr>
    
    <!-- Main Content -->
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="color: #333; margin: 0 0 20px 0; font-size: 22px;">
          Hi ${userName} 👋
        </h2>
        
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          This is a friendly reminder that your <strong style="color: #667eea;">${planName}</strong> subscription will expire in <strong style="color: #e74c3c;">${daysRemaining} days</strong>.
        </p>
        
        <!-- Expiry Box -->
        <div style="background-color: #fff8e1; border-left: 4px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 4px;">
          <p style="margin: 0; color: #856404; font-size: 15px;">
            <strong>📅 Expiry Date:</strong> ${expiryDate}
          </p>
        </div>
        
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
          To continue your spiritual journey without interruption, renew your subscription today and keep accessing:
        </p>
        
        <!-- Features -->
        <ul style="color: #555; font-size: 15px; line-height: 2; padding-left: 20px; margin: 0 0 30px 0;">
          <li>Unlimited spiritual guidance</li>
          <li>WhatsApp chat support</li>
          <li>Priority responses</li>
          <li>Personalized insights</li>
        </ul>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://eternalguide.com'}/pricing" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; display: inline-block;">
            Renew Now →
          </a>
        </div>
        
        <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
          If you have any questions, simply reply to this email. We're here to help!
        </p>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 13px; margin: 0 0 10px 0;">
          With blessings,<br>
          <strong>The EternalGuide Team</strong>
        </p>
        <p style="color: #aaa; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} EternalGuide. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
    }

    /**
     * HTML template for expired notification
     */
    private static getExpiredNotificationHTML(
        userName: string,
        planName: string
    ): string {
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Expired</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">EternalGuide</h1>
      </td>
    </tr>
    
    <!-- Main Content -->
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="color: #333; margin: 0 0 20px 0; font-size: 22px;">
          Hi ${userName},
        </h2>
        
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Your <strong style="color: #667eea;">${planName}</strong> subscription has expired. We hope your spiritual journey with us has been enlightening!
        </p>
        
        <!-- Expired Box -->
        <div style="background-color: #ffebee; border-left: 4px solid #f44336; padding: 20px; margin: 25px 0; border-radius: 4px;">
          <p style="margin: 0; color: #c62828; font-size: 15px;">
            <strong>⚠️ Your access to premium features has been paused.</strong>
          </p>
        </div>
        
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
          Don't let your spiritual growth pause! Renew now to continue receiving personalized guidance and wisdom.
        </p>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://eternalguide.com'}/pricing" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; display: inline-block;">
            Renew Subscription →
          </a>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 13px; margin: 0 0 10px 0;">
          With blessings,<br>
          <strong>The EternalGuide Team</strong>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
    }
}