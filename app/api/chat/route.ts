import { classifyQuestion } from '@/lib/classification/question-classify';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, smoothStream } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;
const MODEL_NAME = "gpt-4o";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    // Classify the question and get routed response
    const routedQuestion = await classifyQuestion(
      messages[messages.length - 1].content
    );

    const contextDocuments = routedQuestion.relevantDocuments
      .map(
        (doc) =>
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
        `;

    const result = streamText({
      model: openai(MODEL_NAME),
      messages,
      onError: (error) => {
        console.log('error', error);
      },
      system: systemPrompt,
      experimental_transform: [smoothStream({ chunking: 'word' })],
      abortSignal: req.signal,
    });

    return result.toDataStreamResponse({
      sendReasoning: true,
      getErrorMessage: (error) => {
        return (error as { message: string }).message;
      },
    });
  } catch (error) {
    console.log('error', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
