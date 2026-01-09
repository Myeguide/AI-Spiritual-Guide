import { AuthMiddleware } from '@/app/middleware/middleware';
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

  try {
    const { messages } = await req.json();
    const auth = AuthMiddleware(req);

    if ("error" in auth) {
      return NextResponse.json(auth, { status: auth.status });
    }
    const { userId, userAge } = auth;

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

    // Initialize OpenAI and prepare for streaming
    // NOTE: We increment the request usage AFTER successful completion (in onFinish callback)
    // instead of before streaming starts. This prevents 502 errors when streaming fails,
    // as incrementing before streaming could cause the counter to increase even if the
    // response never reaches the user due to server crashes or network issues.
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      compatibility: "strict"
    });
    
    // Get user memory and classify question
    const userMemory = await getMemorySummary(userId);
    const routedQuestion = await classifyQuestion(
      messages[messages.length - 1].content
    );

    const contextDocuments = routedQuestion.templateContent
    const confidence = routedQuestion.confidence;
    const isAdult = typeof userAge === 'number' && userAge > 21;
    const systemPrompt = `
    You are a spiritual guide and AI spiritual assistant that specializes in answering questions based on spiritual knowledge and wisdom.
    Confidence Level: ${(confidence * 100).toFixed(1)}%
    When answering questions, use the spiritual context documents to provide accurate, compassionate, and relevant information:

    **Note**
    Always avoid using the word Hinduism or Hindu, instead use Vedanta, vedic, or sanatan dharma.
    At the end of every response, include 2–3 brief follow-up questions to clarify, deepen, or continue the conversation.
    
    === SPIRITUAL CONTEXT DOCUMENTS ===
    ${isAdult ? contextDocuments : CHILDREN_YOUTH}
    
    User Context:
    ${userMemory || "No previous information about this user."}
  `;

    // Track if request was counted to prevent double-counting
    let requestCounted = false;

    const result = streamText({
      model: openai(MODEL_NAME),
      messages,
      onFinish: async ({ text: finalCompletion }) => {
        try {
          // Increment request usage only on successful completion
          if (!requestCounted) {
            // Verify subscription is still valid before incrementing
            const currentSub = await SubscriptionService.getActiveSubscription(userId);
            if (currentSub && currentSub.id === activeSubscription.id) {
              await SubscriptionService.incrementRequestUsage(activeSubscription.id);
              requestCounted = true;
            } else {
              console.warn('Subscription changed during streaming, not incrementing');
            }
          }
          
          // Update user memory
          await updateMemory({
            userId,
            lastUserMessage: messages[messages.length - 1].content,
            lastAssistantMessage: finalCompletion,
          });
        } catch (error) {
          console.error('Failed to update memory or increment usage:', error);
          // Even if memory update fails, we already counted the request
        }
      },
      onError: async (error) => {
        console.error('Streaming error:', error);
        // Don't increment request count on error
        requestCounted = false;
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

    // Check if headers were already sent (streaming started)
    // In that case, we can't send a JSON response
    if (error instanceof Error) {
      // Check if it's a rate limit error
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message: 'OpenAI rate limit exceeded. Please try again in a moment.'
          },
          { status: 429 }
        );
      }

      // Check if it's an OpenAI API error
      if (error.message.includes('OpenAI') || error.message.includes('API')) {
        return NextResponse.json(
          {
            success: false,
            error: 'AI Service Error',
            message: 'Unable to connect to AI service. Please try again later.'
          },
          { status: 503 }
        );
      }

      // Check if it's a database error
      if (error.message.includes('database') || error.message.includes('prisma')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Database Error',
            message: 'Unable to access database. Please try again later.'
          },
          { status: 503 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    );
  }
}
