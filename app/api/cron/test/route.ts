import { NextRequest, NextResponse } from 'next/server';

// Simple test route to verify cron job is working
export async function GET(req: NextRequest) {
    const timestamp = new Date().toISOString();
    
    // Log to console (will appear in PM2 logs)
    console.log('========================================');
    console.log('🔔 CRON TEST JOB EXECUTED');
    console.log(`📅 Timestamp: ${timestamp}`);
    console.log(`🌐 Request URL: ${req.url}`);
    console.log('========================================');
    
    return NextResponse.json({
        success: true,
        message: 'Cron test job executed successfully!',
        timestamp: timestamp,
        test: 'This is a simple test to verify cron is working',
    });
}

