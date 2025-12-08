import { MSG91_CONFIG, msg91WhatsAppRequest } from '@/lib/msg91';
import { prisma } from '@/lib/prisma';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { classifyQuestion } from '@/lib/classification/question-classify';
import { getMemorySummary, updateMemory } from '@/lib/user-memory';

export class WhatsAppError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 400
    ) {
        super(message);
        this.name = 'WhatsAppError';
    }
}

export class WhatsAppService {
    /**
     * Send welcome message when user purchases a paid plan
     */
    static async sendWelcomeMessage(
        phoneNumber: string,
        userName: string,
        planName: string
    ): Promise<void> {
        try {
            const formattedNumber = phoneNumber.startsWith('+')
                ? phoneNumber.slice(1)
                : phoneNumber;

            // Send template message (required for initiating conversation)
            await msg91WhatsAppRequest('/send', {
                integrated_number: MSG91_CONFIG.whatsappNumber,
                content_type: 'template',
                payload: {
                    to: formattedNumber,
                    type: 'template',
                    template: {
                        name: MSG91_CONFIG.whatsappTemplateName,
                        language: {
                            code: 'en',
                            policy: 'deterministic',
                        },
                        components: [
                            {
                                type: 'body',
                                parameters: [
                                    { type: 'text', text: userName },
                                    { type: 'text', text: planName },
                                ],
                            },
                        ],
                    },
                },
            });

            // Mark user as WhatsApp enabled
            await prisma.user.update({
                where: { phoneNumber },
                data: { whatsappEnabled: true },
            });

            console.log(`WhatsApp welcome message sent to ${phoneNumber}`);
        } catch (error: any) {
            console.error('WhatsApp welcome message error:', error);
            throw new WhatsAppError(
                error.message || 'Failed to send WhatsApp message',
                'WHATSAPP_SEND_ERROR',
                500
            );
        }
    }

    /**
     * Send reply message to user (within 24hr window)
     */
    static async sendReplyMessage(
        phoneNumber: string,
        message: string
    ): Promise<void> {
        try {
            const formattedNumber = phoneNumber.startsWith('+')
                ? phoneNumber.slice(1)
                : phoneNumber;

            await msg91WhatsAppRequest('/send', {
                integrated_number: MSG91_CONFIG.whatsappNumber,
                content_type: 'text',
                payload: {
                    to: formattedNumber,
                    type: 'text',
                    text: {
                        body: message,
                    },
                },
            });

            console.log(`WhatsApp reply sent to ${phoneNumber}`);
        } catch (error: any) {
            console.error('WhatsApp reply error:', error);
            throw new WhatsAppError(
                error.message || 'Failed to send WhatsApp reply',
                'WHATSAPP_REPLY_ERROR',
                500
            );
        }
    }

    /**
     * Process incoming message and generate AI response
     */
    static async processIncomingMessage(
        phoneNumber: string,
        userMessage: string
    ): Promise<string> {
        // Find user by phone number
        const user = await prisma.user.findUnique({
            where: { phoneNumber },
            include: {
                Subscription: {
                    where: { status: 'ACTIVE' },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        if (!user) {
            return "Sorry, we couldn't find your account. Please register on our app first.";
        }

        if (!user.whatsappEnabled) {
            return "WhatsApp feature is not enabled for your account. Please purchase a paid plan to access this feature.";
        }

        const activeSubscription = user.Subscription[0];

        if (!activeSubscription || activeSubscription.planType === 'free') {
            return "WhatsApp chat is available only for paid plan subscribers. Please upgrade your plan in the app.";
        }

        // Check subscription validity
        if (activeSubscription.expiresAt && activeSubscription.expiresAt < new Date()) {
            return "Your subscription has expired. Please renew your plan in the app to continue using WhatsApp chat.";
        }

        // Check request limits
        if (activeSubscription.requestsUsed >= activeSubscription.totalRequests) {
            return "You have reached your question limit. Please upgrade your plan for more questions.";
        }

        // Generate AI response (reuse your existing logic)
        const aiResponse = await this.generateAIResponse(user.id, userMessage);

        // Increment usage
        await prisma.subscription.update({
            where: { id: activeSubscription.id },
            data: { requestsUsed: { increment: 1 } },
        });

        return aiResponse;
    }

    /**
     * Generate AI response for WhatsApp message
     */
    private static async generateAIResponse(
        userId: string,
        userMessage: string
    ): Promise<string> {

        try {
            const openai = createOpenAI({
                apiKey: process.env.OPENAI_API_KEY!,
                compatibility: 'strict',
            });

            const userMemory = await getMemorySummary(userId);
            const routedQuestion = await classifyQuestion(userMessage);

            const systemPrompt = `
        You are a spiritual guide AI assistant on WhatsApp.
        Keep responses concise (under 1000 characters) as this is WhatsApp.
        
        === SPIRITUAL CONTEXT ===
        ${routedQuestion.templateContent}
        
        User Context:
        ${userMemory || 'No previous information about this user.'}
      `;

            const result = await generateText({
                model: openai('gpt-4o'),
                messages: [{ role: 'user', content: userMessage }],
                system: systemPrompt,
                maxTokens: 500, // Keep responses shorter for WhatsApp
            });

            // Update memory
            await updateMemory({
                userId,
                lastUserMessage: userMessage,
                lastAssistantMessage: result.text,
            });

            return result.text;
        } catch (error) {
            console.error('AI generation error:', error);
            return "I apologize, but I'm having trouble processing your question right now. Please try again later.";
        }
    }
}