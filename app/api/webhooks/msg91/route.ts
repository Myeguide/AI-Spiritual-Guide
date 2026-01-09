import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppService } from '@/lib/services/whatsapp.service';
import { prisma } from '@/lib/prisma';

// In-memory cache to prevent duplicate processing (TTL: 5 minutes)
const processedMessages = new Map<string, number>();
const MESSAGE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean up old entries periodically
function cleanupProcessedMessages() {
  const now = Date.now();
  for (const [key, timestamp] of processedMessages.entries()) {
    if (now - timestamp > MESSAGE_TTL) {
      processedMessages.delete(key);
    }
  }
}

// Check if message was already processed
function isMessageProcessed(messageId: string): boolean {
  cleanupProcessedMessages();
  return processedMessages.has(messageId);
}

// Mark message as processed
function markMessageProcessed(messageId: string) {
  processedMessages.set(messageId, Date.now());
}

// MSG91 WhatsApp webhook payload types (based on actual payload)
interface MSG91WebhookPayload {
  // MSG91 actual format
  customerNumber?: string;
  customerName?: string;
  text?: string;
  contentType?: string;
  eventName?: string;
  uuid?: string;
  integratedNumber?: string;
  messages?: string; // JSON string array
  companyId?: string;
  requestedAt?: string;
  ts?: string;
  // Alternative formats
  data?: Array<{
    type?: string;
    from?: string;
    timestamp?: string;
    message?: {
      type: string;
      text?: { body: string };
      id?: string;
    };
  }>;
  type?: string;
  payload?: {
    type: string;
    from: string;
    text?: { body: string };
    id?: string;
  };
  from?: string;
  message_type?: string;
  message_id?: string;
}

// Extract message details from various MSG91 payload formats
function extractMessageDetails(body: MSG91WebhookPayload): {
  phoneNumber: string | null;
  userMessage: string | null;
  messageId: string | null;
  customerName: string | null;
  eventName: string | null;
} {
  // Format 1: MSG91 actual format (customerNumber + text)
  if (body.customerNumber && body.text && body.contentType === 'text') {
    return {
      phoneNumber: body.customerNumber,
      userMessage: body.text,
      messageId: body.uuid || null,
      customerName: body.customerName || null,
      eventName: body.eventName || null,
    };
  }

  // Format 2: Parse from messages JSON string
  if (body.messages && body.customerNumber) {
    try {
      const messagesArray = JSON.parse(body.messages);
      if (Array.isArray(messagesArray) && messagesArray.length > 0) {
        const msg = messagesArray[0];
        if (msg.type === 'text' && msg.text?.body) {
          return {
            phoneNumber: msg.from || body.customerNumber,
            userMessage: msg.text.body,
            messageId: msg.id || body.uuid || null,
            customerName: body.customerName || null,
            eventName: body.eventName || null,
          };
        }
      }
    } catch {
      // If parsing fails, continue to other formats
    }
  }

  // Format 3: data array format
  if (body.data && Array.isArray(body.data) && body.data.length > 0) {
    const item = body.data[0];
    if (item.message?.type === 'text' && item.message?.text?.body) {
      return {
        phoneNumber: item.from || null,
        userMessage: item.message.text.body,
        messageId: item.message.id || null,
        customerName: null,
        eventName: null,
      };
    }
  }

  // Format 4: type/payload format
  if (body.type === 'message' && body.payload?.type === 'text') {
    return {
      phoneNumber: body.payload.from || null,
      userMessage: body.payload.text?.body || null,
      messageId: body.payload.id || null,
      customerName: null,
      eventName: null,
    };
  }

  // Format 5: flat format with 'from'
  if (body.from && body.text) {
    return {
      phoneNumber: body.from,
      userMessage: body.text,
      messageId: body.message_id || null,
      customerName: null,
      eventName: null,
    };
  }

  return { phoneNumber: null, userMessage: null, messageId: null, customerName: null, eventName: null };
}

// Format phone number to match DB format (+countrycode...)
function formatPhoneNumber(phone: string): string {
  // Remove any spaces, dashes, or parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Add + prefix if missing
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Handle empty body gracefully
    let body: MSG91WebhookPayload;
    try {
      const text = await req.text();
      if (!text || text.trim() === '') {
        return NextResponse.json({ status: 'ignored', reason: 'empty body' });
      }
      body = JSON.parse(text);
    } catch (parseError) {
      return NextResponse.json({ status: 'ignored', reason: 'invalid json' });
    }

    // Extract message details from the payload
    const { phoneNumber, userMessage, messageId, customerName, eventName } = extractMessageDetails(body);

    // Skip delivery/read receipts and status updates (these don't have actual messages)
    const statusEvents = ['delivered', 'read', 'sent', 'failed', 'deleted'];
    if (eventName && statusEvents.includes(eventName.toLowerCase()) && !userMessage) {
      return NextResponse.json({ status: 'ignored', reason: `status event: ${eventName}` });
    }

    // Skip if no message content (status update with eventName like 'delivered' but has text from previous)
    if (!phoneNumber || !userMessage) {
      return NextResponse.json({ 
        status: 'ignored', 
        reason: 'missing phone number or message content' 
      });
    }

    // Deduplicate: Skip if we've already processed this message
    const dedupeKey = messageId || `${phoneNumber}-${userMessage}-${body.ts || body.requestedAt}`;
    if (isMessageProcessed(dedupeKey)) {
      return NextResponse.json({ status: 'ignored', reason: 'duplicate message' });
    }
    
    // Mark as processed immediately to prevent race conditions
    markMessageProcessed(dedupeKey);

    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Find user by phone number
    const user = await prisma.user.findUnique({
      where: { phoneNumber: formattedPhone },
    });

    if (!user) {
      // Try alternative formats (with/without country code variations)
      const alternativePhone = formattedPhone.startsWith('+91') 
        ? formattedPhone.replace('+91', '+')
        : `+91${formattedPhone.replace('+', '')}`;
      
      const altUser = await prisma.user.findUnique({
        where: { phoneNumber: alternativePhone },
      });

      if (!altUser) {
        // Still send a response to the user
        try {
          await WhatsAppService.sendReplyMessage(
            formattedPhone,
            "Welcome! It looks like you haven't registered yet. Please visit our app and create an account to chat with me here on WhatsApp."
          );
        } catch (sendError) {
          console.error('[WhatsApp Webhook] Failed to send unregistered user message:', sendError);
        }
        return NextResponse.json({ status: 'user_not_found' });
      }
    }

    const foundUser = user || await prisma.user.findUnique({
      where: { phoneNumber: formattedPhone.startsWith('+91') 
        ? formattedPhone.replace('+91', '+')
        : `+91${formattedPhone.replace('+', '')}` },
    });

    if (foundUser) {
      // Log incoming message
      await prisma.whatsAppMessage.create({
        data: {
          userId: foundUser.id,
          phoneNumber: formattedPhone,
          direction: 'inbound',
          content: userMessage,
          msg91Id: messageId,
        },
      });

      // Send "thinking..." indicator immediately
      try {
        await WhatsAppService.sendReplyMessage(
          foundUser.phoneNumber, 
          "🙏 _Contemplating your question..._"
        );
      } catch (thinkingError) {
        console.error('[WhatsApp Webhook] Failed to send thinking message:', thinkingError);
        // Continue even if thinking message fails
      }

      // Process and generate AI response
      const aiResponse = await WhatsAppService.processIncomingMessage(
        foundUser.phoneNumber, // Use the phone from DB
        userMessage
      );

      // Send the actual response back via WhatsApp
      await WhatsAppService.sendReplyMessage(foundUser.phoneNumber, aiResponse);

      // Log outgoing message (only log the actual response, not the thinking indicator)
      await prisma.whatsAppMessage.create({
        data: {
          userId: foundUser.id,
          phoneNumber: foundUser.phoneNumber,
          direction: 'outbound',
          content: aiResponse,
        },
      });

      const duration = Date.now() - startTime;
    }

    // MSG91 expects a 200 response
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
    // Still return 200 to prevent MSG91 from retrying indefinitely
    return NextResponse.json({ 
      status: 'error', 
      handled: true,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Handle webhook verification (GET request)
export async function GET(req: NextRequest) {
  // MSG91 might send a verification request
  const challenge = req.nextUrl.searchParams.get('challenge');
  if (challenge) {
    return new NextResponse(challenge);
  }
  
  // Also handle hub.challenge for Meta/WhatsApp Business API style verification
  const hubChallenge = req.nextUrl.searchParams.get('hub.challenge');
  if (hubChallenge) {
    return new NextResponse(hubChallenge);
  }
  
  return NextResponse.json({ 
    status: 'webhook endpoint active',
    endpoint: '/api/webhooks/msg91',
    methods: ['GET', 'POST'],
    message: 'Configure this URL in MSG91 WhatsApp settings'
  });
}