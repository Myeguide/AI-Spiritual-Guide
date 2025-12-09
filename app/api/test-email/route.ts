import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/email.service';

export async function GET(req: NextRequest) {
    try {
        const testEmail = 'mdtarikhan007@gmail.com';
        const testName = 'Tarik Khan';
        const planName = 'Premium';
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 5); // 5 days from now
        
        console.log(`Attempting to send test email to ${testEmail}...`);
        
        // Send expiry reminder
        await EmailService.sendSubscriptionExpiryReminder(
            testEmail,
            testName,
            planName,
            expiryDate,
            5
        );
        
        console.log(`✅ Test email sent successfully to ${testEmail}`);
        
        return NextResponse.json({
            success: true,
            message: `Test subscription reminder email sent successfully to ${testEmail}`,
            details: {
                recipient: testEmail,
                name: testName,
                planName,
                expiryDate: expiryDate.toISOString(),
                daysRemaining: 5
            }
        });
        
    } catch (error: any) {
        console.error('❌ Failed to send test email:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to send test email',
                details: error
            },
            { status: 500 }
        );
    }
}

// Also create POST endpoint for custom testing
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            email = 'mdtarikhan007@gmail.com',
            name = 'Tarik Khan',
            planName = 'Premium',
            daysRemaining = 5,
            type = 'reminder' // 'reminder' or 'expired'
        } = body;
        
        console.log(`Sending ${type} email to ${email}...`);
        
        if (type === 'expired') {
            await EmailService.sendSubscriptionExpiredNotification(
                email,
                name,
                planName
            );
        } else {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + daysRemaining);
            
            await EmailService.sendSubscriptionExpiryReminder(
                email,
                name,
                planName,
                expiryDate,
                daysRemaining
            );
        }
        
        console.log(`✅ Test ${type} email sent successfully`);
        
        return NextResponse.json({
            success: true,
            message: `Test ${type} email sent successfully to ${email}`,
        });
        
    } catch (error: any) {
        console.error('❌ Failed to send test email:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to send test email',
            },
            { status: 500 }
        );
    }
}

