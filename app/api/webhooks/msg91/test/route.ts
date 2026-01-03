import { NextRequest, NextResponse } from 'next/server';

// Test endpoint to simulate MSG91 webhook locally
// Use this to test your WhatsApp integration without needing MSG91
// 
// Example curl command:
// curl -X POST http://localhost:3000/api/webhooks/msg91/test \
//   -H "Content-Type: application/json" \
//   -d '{"phoneNumber": "+919876543210", "message": "What is karma?"}'

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test endpoint disabled in production' }, { status: 403 });
  }

  try {
    const { phoneNumber, message } = await req.json();

    if (!phoneNumber || !message) {
      return NextResponse.json({
        error: 'Missing required fields',
        usage: {
          phoneNumber: '+919876543210',
          message: 'Your test message here'
        }
      }, { status: 400 });
    }

    // Simulate MSG91 webhook payload
    const msg91Payload = {
      data: [
        {
          type: 'message',
          from: phoneNumber.replace('+', ''),
          timestamp: new Date().toISOString(),
          message: {
            type: 'text',
            text: { body: message },
            id: `test_${Date.now()}`,
          },
        },
      ],
    };

    // Forward to the actual webhook handler
    const webhookUrl = new URL('/api/webhooks/msg91', req.url);
    const response = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(msg91Payload),
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Test webhook sent',
      webhookResponse: result,
      simulatedPayload: msg91Payload,
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/webhooks/msg91/test',
    description: 'Test endpoint to simulate MSG91 WhatsApp webhooks locally',
    usage: {
      method: 'POST',
      body: {
        phoneNumber: '+919876543210 (user phone number from your DB)',
        message: 'The message to send',
      },
    },
    example: `curl -X POST http://localhost:3000/api/webhooks/msg91/test -H "Content-Type: application/json" -d '{"phoneNumber": "+919876543210", "message": "What is karma?"}'`,
  });
}

