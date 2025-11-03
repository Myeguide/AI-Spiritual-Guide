import { classifyQuestion } from '@/lib/classification/question-classify';
import { verifyToken } from '@/lib/generate-token';
import { SubscriptionService } from '@/lib/services/subscription.service';
import { UserService } from '@/lib/services/user.service';
import { getMemorySummary, updateMemory } from '@/lib/user-memory';
import { CHILDREN_YOUTH } from '@/prompts/children_youth';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, smoothStream } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

const MODEL_NAME = 'gpt-4o';

export async function POST(req: NextRequest) {
  process.env.OPENAI_API_KEY = "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"

  try {
    const { messages } = await req.json();
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1] as string;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const verified = verifyToken(token);
    if (!verified) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      )
    }
    const userId = verified.userId;
    const userAge = verified.age;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get user with active subscription
    const user = await UserService.getUserById(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get active subscription
    const activeSubscription = await SubscriptionService.getActiveSubscription(userId);

    if (!activeSubscription) {
      return NextResponse.json({
        success: false,
        error: 'No active subscription found',
        message: 'Please subscribe to a plan to continue using this service',
        data: {
          hasActiveSubscription: false,
          subscription: null,
        },
      }, { status: 403 });
    }

    // Check if subscription has expired or requests exhausted
    const isExpired = SubscriptionService.isSubscriptionExpiredByDate(activeSubscription);

    if (isExpired) {
      await SubscriptionService.markAsExpired(activeSubscription.id);
      return NextResponse.json({
        success: false,
        error: 'Subscription expired',
        message: 'Your subscription has expired or you have used all available requests. Please renew or upgrade your plan.',
        data: {
          hasActiveSubscription: false,
          subscription: activeSubscription,
          requestsUsed: activeSubscription.requestsUsed,
          totalRequests: activeSubscription.totalRequests,
          requestsRemaining: 0,
        },
      }, { status: 403 });
    }

    // Check remaining requests
    const requestsRemaining = activeSubscription.totalRequests - activeSubscription.requestsUsed;
    if (requestsRemaining <= 0) {
      await SubscriptionService.markAsExpired(activeSubscription.id);
      return NextResponse.json({
        success: false,
        error: 'Request limit reached',
        message: 'You have used all your available requests. Please upgrade your plan.',
        data: {
          hasActiveSubscription: true,
          subscription: activeSubscription,
          requestsUsed: activeSubscription.requestsUsed,
          totalRequests: activeSubscription.totalRequests,
          requestsRemaining: 0,
        },
      }, { status: 429 });
    }

    // Increment request usage
    await SubscriptionService.incrementRequestUsage(activeSubscription.id);
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      compatibility: "strict"
    });
    const userMemory = await getMemorySummary(userId);

    // Classify the question and get routed response
    const routedQuestion = await classifyQuestion(
      messages[messages.length - 1].content
    );

    const contextDocuments = routedQuestion.templateContent
    const confidence = routedQuestion.confidence;
    const isAdult = typeof userAge === 'number' && userAge > 21;
    const systemPrompt = `
    You are a spiritual guide and AI assistant that specializes in answering questions based on spiritual knowledge and wisdom.
    Confidence Level: ${(confidence * 100).toFixed(1)}%
    When answering questions, use the following spiritual context documents to provide accurate, compassionate, and relevant information:

    **Note**
    Always avoid using the word Hinduism or Hindu, instead use Vedanta, vedic, or sanatan dharma.
    
    === SPIRITUAL CONTEXT DOCUMENTS ===
    ${isAdult ? contextDocuments : CHILDREN_YOUTH}
    
    User Context:
    ${userMemory || "No previous information about this user."}
  `;

    const result = streamText({
      model: openai(MODEL_NAME),
      messages,
      onFinish: async ({ text: finalCompletion }) => {
        console.log('on finish')
        try {
          await updateMemory({
            userId,
            lastUserMessage: messages[messages.length - 1].content,
            lastAssistantMessage: finalCompletion,
          });
        } catch (error) {
          console.error('Failed to update memory:', error);
        }
      },
      onError: (error) => {
        console.error('Streaming error:', error);
      },
      system: systemPrompt,
      experimental_transform: [smoothStream({ chunking: 'word' })],
      abortSignal: req.signal,
    });

    // Use textStream and manually create Response - this ensures onFinish works
    return result.toDataStreamResponse({
      sendReasoning: true,
      getErrorMessage: (error) => {
        return (error as { message: string }).message;
      },
    });

  } catch (error) {
    console.error('Request error:', error);

    // Check if it's a rate limit error
    if (error instanceof Error && error.message.includes('rate limit')) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: error.message
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}