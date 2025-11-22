import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import fs from 'fs';
import path from 'path';

export interface ClassificationResult {
    documentType: string;
    confidence: number;
    question: string;
    templateContent: string;
    reasoning: string;
    matchedKeywords: string[];
}

const POSSIBLE_PROMPTS_DIRS = [
    path.join(process.cwd(), 'prompts'),
    path.join(process.cwd(), '.next', 'server', 'prompts'),
    path.join(__dirname, '..', '..', 'prompts'),
    path.join(__dirname, '..', '..', '..', 'prompts'),
    '/var/task/prompts', // Common Lambda path
];

// Cache templates in memory (optional optimization)
const templateCache = new Map<string, string>();
const DEFAULT_GENERAL_TEMPLATE = `You are a compassionate spiritual guide. Answer questions with wisdom from Vedic traditions, providing practical guidance while respecting all spiritual paths.`;

/**
 * Find the correct prompts directory
 */
function findPromptsDir(): string | null {
    for (const dir of POSSIBLE_PROMPTS_DIRS) {
        try {
            if (fs.existsSync(dir)) {
                return dir;
            }
        } catch (error) {
            // Continue to next path
        }
    }
    return null;
}


/**
 * Load template from local file system
 */
export function loadTemplate(documentType: string): string {
    // Check cache first
    if (templateCache.has(documentType)) {
        return templateCache.get(documentType)!;
    }

     const promptsDir = findPromptsDir();
    console.log("Prompts directory:", promptsDir);
    if (!promptsDir) {
        return DEFAULT_GENERAL_TEMPLATE;
    }
 
    try {
        const filePath = path.join(promptsDir, `${documentType}.txt`);
        console.log(`Loading template from: ${filePath}`);

        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf-8');

        // Cache it
        templateCache.set(documentType, content);
        return content;
    } catch (error) {
        console.error(`Failed to load template for ${documentType}:`, error);

        // Fallback to general template
        try {
            const generalPath = path.join(promptsDir, 'general.txt');

            if (fs.existsSync(generalPath)) {
                const generalContent = fs.readFileSync(generalPath, 'utf-8');
                return generalContent;
            }
        } catch (fallbackError) {
            console.error('Failed to load general template:', fallbackError);
        }
        return DEFAULT_GENERAL_TEMPLATE;
    }
}

/**
 * LLM-based classification fallback
 */
export async function llmClassify(question: string): Promise<{
    type: string;
    confidence: number;
    reasoning: string;
}> {
    const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
    });
    const availableTypes = [
        "sex_marriage_intimacy_desire",
        "about_god",
        "afterlife_cosmic_process",
        "dharma_smrti_law",
        "practical_techniques",
        "emotional_spiritual",
        "vedic_observance_rituals_dates",
        "astrology",
        "ayurveda_health",
        "sages_saints_deities",
        "comparative_theological",
        "definition_concept_spiritual_clarification",
    ];

    const { text } = await generateText({
        model: openai('gpt-4o'),
        messages: [{
            role: "system",
            content: `You are a classifier for spiritual questions. Classify the question into ONE category.

Available categories:
${availableTypes.map(t => `- ${t}`).join('\n')}

Respond with ONLY the category name. If uncertain, respond with "general".`
        }, {
            role: "user",
            content: question
        }],
        temperature: 0.2,
        maxTokens: 50,
    });

    const type = text.trim().toLowerCase();
    const validType = availableTypes.includes(type) ? type : "general";

    return {
        type: validType,
        confidence: 0.85,
        reasoning: `LLM classified as ${validType}`
    };
}
