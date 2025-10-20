import { classifyQuestion } from '@/lib/classification/question-classify';
import { verifyToken } from '@/lib/generate-token';
import { checkRateLimit, recordTokenUsage } from '@/lib/rate-limiter';
import { getMemorySummary, updateMemory } from '@/lib/user-memory';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, smoothStream } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

const MODEL_NAME = 'gpt-4o';

export async function POST(req: NextRequest) {
  //process.env.OPENAI_API_KEY = "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"

  try {
    const { messages } = await req.json();
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1] as string;
    const userId = verifyToken(token) || "";

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Estimate tokens before making the call
    const estimatedTokens = Math.ceil(
      messages.map((m: any) => m.content).join('').length / 4
    ) + 1000; // Buffer for response + context

    // Check rate limit BEFORE processing
    const rateLimitCheck = await checkRateLimit(userId, estimatedTokens);


    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: rateLimitCheck.reason,
          details: {
            tier: rateLimitCheck.tier,
            tokensRemaining: rateLimitCheck.tokensRemaining,
            retryAfter: rateLimitCheck.retryAfter,
            limits: rateLimitCheck.limits,
          }
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Tier': rateLimitCheck.tier,
            'X-RateLimit-Remaining': rateLimitCheck.tokensRemaining?.toString() || '0',
            'Retry-After': rateLimitCheck.retryAfter?.toString() || '60',
          }
        }
      );
    }

    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      compatibility: "strict"
    });

    const userMemory = await getMemorySummary(userId);

    // Classify the question and get routed response
    const routedQuestion = await classifyQuestion(
      messages[messages.length - 1].content
    );

    const contextDocuments = routedQuestion.relevantDocuments
      .map(
        (doc: any) =>
          `Title: ${doc.title}\nDescription: ${doc.description}\n\nContent: ${doc.content}`
      )
      .join("\n\n---\n\n");

    const confidence = routedQuestion.confidence;
    const systemPrompt = `
      You are a spiritual guide and AI assistant that specializes in answering questions based on spiritual knowledge and wisdom.
      Confidence Level: ${(confidence * 100).toFixed(1)}%
      When answering questions, use the following spiritual context documents to provide accurate, compassionate, and relevant information:
      
      === SPIRITUAL CONTEXT DOCUMENTS ===
      ${contextDocuments}
      
      User Context:
      ${userMemory || "No previous information about this user."}
    `;

    const result = streamText({
      model: openai(MODEL_NAME),
      messages,
      onFinish: async ({ text: finalCompletion, usage }) => {
        const actualTokens = usage?.totalTokens || estimatedTokens;

        try {
          await recordTokenUsage(userId, actualTokens);
          console.log(`✅ Recorded ${actualTokens} tokens for user ${userId}`);
        } catch (error) {
          console.error('Failed to record token usage:', error);
        }
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

    // Check if it's a rate limit error
    if (error instanceof Error && error.message.includes('rate limit')) {
      return NextResponse.json(
        { error: error.message },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}