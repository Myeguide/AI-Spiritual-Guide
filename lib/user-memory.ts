import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { prisma } from "@/lib/prisma";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface MemoryResult {
    information_found: boolean;
    updated_summary: string;
    categories_updated?: string[]; // Optional: track which categories changed
}

interface UpdateMemoryParams {
    userId: string;
    lastUserMessage: string;
    lastAssistantMessage: string;
}

interface MemoryUpdateResult {
    success: boolean;
    updated: boolean;
    memoryId?: string;
    error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MODEL_CONFIG = {
    model: "gpt-4o",
    temperature: 0.2,
    timeout: 30000, // 30 second timeout
} as const;

const FUNCTION_DEFINITION = {
    name: "memory_extractor",
    description: "Extracts and summarizes user information from a conversation.",
    parameters: {
        type: "object",
        properties: {
            information_found: {
                type: "boolean",
                description:
                    "Set to true if new, permanent, and non-trivial information about the user was found. Otherwise, set to false.",
            },
            updated_summary: {
                type: "string",
                description:
                    "The new, complete summary of the user. If new information was found, integrate it into the previous summary. If no new information was found, return the previous summary unchanged.",
            },
            categories_updated: {
                type: "array",
                items: { type: "string" },
                description:
                    "List of categories that were updated (e.g., 'spiritual_preferences', 'practice_preferences', 'location')",
            },
        },
        required: ["information_found", "updated_summary"],
    },
} as const;

const DEFAULT_SUMMARY = "No information stored yet.";

const SYSTEM_PROMPT = `You are an expert at analyzing conversations and extracting key user information.

WHAT TO STORE (long-term, useful for personalization):

1. Spiritual Preferences
   - Preferred deity/deities (e.g., Durga, Krishna, Shiva)
   - Preferred gurus/saints (e.g., Siddharudha Swami, Sathya Sai Baba)
   - Preferred scripture focus (e.g., Bhagavad Gita, Srimad Bhagavatam)

2. Practice Preferences
   - Preferred spiritual practices (e.g., meditation, japa, breathwork, mantra chanting)
   - Practice formats (short daily practice, long reading, experiential practices, etc.)

3. Lifestyle & Contextual Anchors
   - User's location (city, country, timezone)
   - Language preference (Hindi, English, Sanskrit, etc.)
   - Age bracket (child/teen/adult/elder)
   - Name, profession, family context

4. Engagement Preferences
   - Whether the user prefers shorter/concise answers or longer/deeper explanations
   - Whether the user prefers devotional, philosophical, or practical tone
   - Goals or aspirations (spiritual growth, stress relief, learning, etc.)

5. Personal Context
   - Beliefs, values, personal challenges
   - Important life events or circumstances affecting their spiritual journey

WHAT NOT TO STORE (short-lived or too sensitive):
- Temporary emotions (e.g., "I'm depressed today," "I feel angry")
- Ephemeral details (e.g., "I'm at the park now," "I had a fight today")
- Sensitive identifiers (exact addresses, phone numbers, financial details, medical diagnoses)

INSTRUCTIONS:
- Be liberal in extracting information - if the user shares something about themselves, it's likely worth storing
- Integrate new information with the existing summary, don't overwrite everything
- Keep the summary organized and readable
- If a preference changes, update it accordingly

Current user summary: {previous_summary}`;

const USER_PROMPT = `Analyze this conversation and extract important user information:
     
User Message: "{last_user_message}"
Assistant Message: "{last_assistant_message}"

Extract ANY meaningful information about the user, including: names, preferences, beliefs, profession, location, spiritual interests, goals, and personal context.`;

// ============================================================================
// Model & Chain Setup
// ============================================================================

/**
 * Creates a configured ChatOpenAI model instance
 */
function createModel(): ChatOpenAI {
    return new ChatOpenAI(MODEL_CONFIG);
}

/**
 * Creates the memory extraction chain with function calling
 */
function createMemoryChain() {
    const model = createModel();

    const modelWithFunctions = model.bind({
        functions: [FUNCTION_DEFINITION],
        function_call: { name: FUNCTION_DEFINITION.name },
    });

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", SYSTEM_PROMPT],
        ["human", USER_PROMPT],
    ]);

    const parser = new JsonOutputFunctionsParser();

    return prompt.pipe(modelWithFunctions).pipe(parser);
}

// Singleton instance
let memoryChain: ReturnType<typeof createMemoryChain> | null = null;

/**
 * Gets or creates the memory chain singleton
 */
function getMemoryChain() {
    if (!memoryChain) {
        memoryChain = createMemoryChain();
    }
    return memoryChain;
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Checks if a user exists in the database
 */
async function userExists(userId: string): Promise<boolean> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true }, // Only fetch id for efficiency
        });
        return !!user;
    } catch (error) {
        console.error("[Memory] Error checking user existence:", error);
        throw new Error("Failed to verify user existence");
    }
}

/**
 * Retrieves existing memory for a user
 */
async function getUserMemory(userId: string): Promise<string> {
    try {
        const userMemory = await prisma.userMemory.findUnique({
            where: { userId },
            select: { content: true }, // Only fetch content
        });

        return userMemory?.content ?? DEFAULT_SUMMARY;
    } catch (error) {
        console.error("[Memory] Error fetching user memory:", error);
        // Return default instead of throwing to allow graceful degradation
        return DEFAULT_SUMMARY;
    }
}

/**
 * Updates or creates user memory in the database
 */
async function saveUserMemory(
    userId: string,
    content: string
): Promise<{ id: string }> {
    try {
        const updatedMemory = await prisma.userMemory.upsert({
            where: { userId },
            update: {
                content,
                updatedAt: new Date(), // Explicitly set updatedAt
            },
            create: {
                userId,
                content,
            },
            select: { id: true }, // Only return id
        });

        return updatedMemory;
    } catch (error) {
        console.error("[Memory] Error saving user memory:", error);
        throw new Error("Failed to save user memory");
    }
}

// ============================================================================
// Memory Extraction
// ============================================================================

/**
 * Extracts memory information using LLM
 */
async function extractMemory(
    previousSummary: string,
    lastUserMessage: string,
    lastAssistantMessage: string
): Promise<MemoryResult> {
    const chain = getMemoryChain();

    try {
        const result = await Promise.race([
            chain.invoke({
                previous_summary: previousSummary,
                last_user_message: lastUserMessage,
                last_assistant_message: lastAssistantMessage,
            }),
            new Promise<never>((_, reject) =>
                setTimeout(
                    () => reject(new Error("Memory extraction timeout")),
                    MODEL_CONFIG.timeout
                )
            ),
        ]) as MemoryResult;

        return result;
    } catch (error) {
        console.error("[Memory] Error during LLM extraction:", error);
        throw error;
    }
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates input parameters
 */
function validateParams(params: UpdateMemoryParams): void {
    const { userId, lastUserMessage, lastAssistantMessage } = params;

    if (!userId?.trim()) {
        throw new Error("userId is required");
    }

    if (!lastUserMessage?.trim()) {
        throw new Error("lastUserMessage is required");
    }

    if (!lastAssistantMessage?.trim()) {
        throw new Error("lastAssistantMessage is required");
    }
}

/**
 * Checks if memory should be updated
 */
function shouldUpdateMemory(
    result: MemoryResult,
    previousSummary: string
): boolean {
    return (
        result.information_found &&
        result.updated_summary !== previousSummary &&
        result.updated_summary.trim() !== ""
    );
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Updates user memory based on conversation
 * 
 * @param params - User ID and conversation messages
 * @returns Result object with success status and metadata
 * 
 * @example
 * ```typescript
 * const result = await updateMemory({
 *   userId: "user123",
 *   lastUserMessage: "I love reading Bhagavad Gita",
 *   lastAssistantMessage: "That's wonderful! The Gita offers profound wisdom..."
 * });
 * ```
 */
export async function updateMemory(
    params: UpdateMemoryParams
): Promise<MemoryUpdateResult> {
    try {
        // Step 1: Validate input
        validateParams(params);
        const { userId, lastUserMessage, lastAssistantMessage } = params;

        // Step 2: Check if user exists
        const exists = await userExists(userId);

        if (!exists) {
            return {
                success: false,
                updated: false,
                error: "User not found",
            };
        }

        // Step 3: Get existing memory
        const previousSummary = await getUserMemory(userId);

        // Step 4: Extract memory using LLM
        const result = await extractMemory(
            previousSummary,
            lastUserMessage,
            lastAssistantMessage
        );

        // Step 5: Check if update is needed
        if (!shouldUpdateMemory(result, previousSummary)) {
            return {
                success: true,
                updated: false,
            };
        }

        // Step 6: Save to database
        const updatedMemory = await saveUserMemory(userId, result.updated_summary);
        return {
            success: true,
            updated: true,
            memoryId: updatedMemory.id,
        };

    } catch (error) {
        if (error instanceof Error) {
            console.error(`[Memory] Error message: ${error.message}`);
            console.error(`[Memory] Error stack:`, error.stack);
        }

        return {
            success: false,
            updated: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Gets the current memory summary for a user
 * Useful for displaying to user or debugging
 */
export async function getMemorySummary(userId: string): Promise<string | null> {
    try {
        const exists = await userExists(userId);
        if (!exists) return null;

        const summary = await getUserMemory(userId);
        return summary === DEFAULT_SUMMARY ? null : summary;
    } catch (error) {
        console.error("[Memory] Error getting memory summary:", error);
        return null;
    }
}
