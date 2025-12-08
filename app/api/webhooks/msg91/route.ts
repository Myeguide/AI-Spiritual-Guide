import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppService } from '@/lib/services/whatsapp.service';
import { prisma } from '@/lib/prisma';

// Verify webhook authenticity (optional but recommended)
function verifyWebhook(req: NextRequest): boolean {
  const secret = req.headers.get('x-webhook-secret');
  return secret === process.env.MSG91_WEBHOOK_SECRET;
}

export async function POST(req: NextRequest) {
  try {
    // Optional: Verify webhook
    // if (!verifyWebhook(req)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await req.json();
    console.log('MSG91 Webhook received:', JSON.stringify(body, null, 2));

    // MSG91 webhook payload structure
    const {
      type,
      payload
    } = body;

    // Handle incoming WhatsApp message
    if (type === 'message' && payload?.type === 'text') {
      const phoneNumber = payload.from; // User's phone number
      const userMessage = payload.text?.body;

      if (!phoneNumber || !userMessage) {
        return NextResponse.json({ status: 'ignored', reason: 'missing data' });
      }

      // Format phone number to match your DB format
      const formattedPhone = phoneNumber.startsWith('+')
        ? phoneNumber
        : `+${phoneNumber}`;

      // Log incoming message
      const user = await prisma.user.findUnique({
        where: { phoneNumber: formattedPhone },
      });

      if (user) {
        // Log the incoming message
        await prisma.whatsAppMessage.create({
          data: {
            userId: user.id,
            phoneNumber: formattedPhone,
            direction: 'inbound',
            content: userMessage,
            msg91Id: payload.id,
          },
        });

        // Process and generate AI response
        const aiResponse = await WhatsAppService.processIncomingMessage(
          formattedPhone,
          userMessage
        );

        // Send the response back via WhatsApp
        await WhatsAppService.sendReplyMessage(formattedPhone, aiResponse);

        // Log outgoing message
        await prisma.whatsAppMessage.create({
          data: {
            userId: user.id,
            phoneNumber: formattedPhone,
            direction: 'outbound',
            content: aiResponse,
          },
        });
      }
    }

    // MSG91 expects a 200 response
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to prevent MSG91 from retrying
    return NextResponse.json({ status: 'error', handled: true });
  }
}

// Handle webhook verification (GET request)
export async function GET(req: NextRequest) {
  // MSG91 might send a verification request
  const challenge = req.nextUrl.searchParams.get('challenge');
  if (challenge) {
    return new NextResponse(challenge);
  }
  return NextResponse.json({ status: 'webhook endpoint active' });
}