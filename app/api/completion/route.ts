import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const openaiApiKey = process.env.OPENAI_API_KEY1 as string;

  if (!openaiApiKey) {
    return NextResponse.json(
      {
        error: 'OpenAI API key is required to enable chat title generation.',
      },
      { status: 400 }
    );
  }

  const openai = createOpenAI({
    apiKey: openaiApiKey,
  });

  const { prompt, isTitle, messageId, threadId } = await req.json();

  try {
    const { text: title } = await generateText({
      model: openai('gpt-4o'),
      system: `
      You are MyEternalGuide's title generator for spiritual conversations.
      Your task: Generate a brief, meaningful title that captures the essence of the user's spiritual query or life situation.
      Remember: The title should feel like a compassionate acknowledgment of their journey, not a clinical label.`,
      prompt: `Generate a title for this message: "${prompt}"
      `,
    });

    return NextResponse.json({ title, isTitle, messageId, threadId });
  } catch (error) {
    console.error('Failed to generate title:', error);
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 }
    );
  }
}