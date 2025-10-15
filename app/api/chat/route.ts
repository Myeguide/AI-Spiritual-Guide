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

    const result = streamText({
      model: openai(MODEL_NAME),
      messages,
      onError: (error) => {
        console.log('error', error);
      },
      system: ``,
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
