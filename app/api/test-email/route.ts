import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/email.service';

/**
 * GET /api/test-email
 * Send a test subscription reminder email
 * Query params: email (optional) - defaults to mdtarikhan007@gmail.com
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email') || 'mdtarikhan007@gmail.com';
        
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 5);

        const providerResponse = await EmailService.sendSubscriptionExpiryReminder(
            email,
            'Test User',
            'Premium',
            expiryDate,
            5
        );

        return NextResponse.json({
            success: true,
            message: `Test reminder email sent to ${email}`,
            providerResponse,
        });
    } catch (error: any) {
        console.error('Failed to send test email:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * POST /api/test-email
 * Send test email (reminder or expired)
 * Body: { type: 'reminder' | 'expired', email?: string }
 */
export async function POST(req: NextRequest) {
    try {
        const { type = 'reminder', email = 'mdtarikhan007@gmail.com' } = await req.json();
        let providerResponse: unknown;

        if (type === 'expired') {
            providerResponse = await EmailService.sendSubscriptionExpiredNotification(email, 'Test User', 'Premium');
        } else {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 5);
            providerResponse = await EmailService.sendSubscriptionExpiryReminder(email, 'Test User', 'Premium', expiryDate, 5);
        }

        return NextResponse.json({
            success: true,
            message: `Test ${type} email sent to ${email}`,
            providerResponse,
        });
    } catch (error: any) {
        console.error('Failed to send test email:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
