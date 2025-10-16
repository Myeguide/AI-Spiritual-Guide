import { RoutedQuestion } from "@/types/question";
import { supabase } from "../supabase";
import { generateEmbedding } from "../generate-embedding";
import { fallbackClassification } from "./fallback-classify";
import { SpiritualDocument } from "@/types/document";

// Constants
const DEFAULT_MATCH_COUNT = 3;
const DEFAULT_CONFIDENCE = 0.75;
const MIN_CONFIDENCE_THRESHOLD = 0.5;
const RELEVANT_DOCS_LIMIT = 5;

// Types
interface TypeDocument {
    document_type: string;
    type_similarity: number;
    content?: string;
}

interface SemanticClassificationOptions {
    matchCount?: number;
    relevantDocsLimit?: number;
    minConfidence?: number;
}

interface SmartRoutingResult {
    suggestedType?: string;
    confidence?: number;
    detectedKeywords?: string[];
    intent?: 'question' | 'statement' | 'greeting' | 'command' | 'other';
    language?: string;
    requiresSemanticSearch?: boolean;
}

// Error classes for better error handling
class SemanticClassificationError extends Error {
    constructor(message: string, public readonly originalError?: unknown) {
        super(message);
        this.name = "SemanticClassificationError";
    }
}

/**
 * Classifies a question using semantic similarity search
 * Falls back to rule-based classification if semantic search fails
 * 
 * @param question - The user's question to classify
 * @param smartResult - Smart routing result (currently unused but kept for API compatibility)
 * @param options - Optional configuration parameters
 * @returns Promise resolving to a RoutedQuestion with classification results
 */
export async function semanticClassification(
    question: string,
    smartResult?: SmartRoutingResult,
    options: SemanticClassificationOptions = {}
): Promise<RoutedQuestion> {
    // Validate input
    if (!question?.trim()) {
        throw new SemanticClassificationError("Question cannot be empty");
    }

    const {
        matchCount = DEFAULT_MATCH_COUNT,
        relevantDocsLimit = RELEVANT_DOCS_LIMIT,
        minConfidence = MIN_CONFIDENCE_THRESHOLD,
    } = options;

    // Check if smart routing already has high confidence
    if (smartResult?.confidence && smartResult.confidence > 0.9) {
        console.log("Using smart routing result due to high confidence");
        // Could skip semantic search if smart routing is very confident
    }

    // Use smart routing suggestions to optimize semantic search
    const effectiveMatchCount = smartResult?.requiresSemanticSearch === false
        ? Math.max(1, matchCount - 1) // Reduce match count if not needed
        : matchCount;

    try {
        const questionEmbedding = await Promise.race([
            generateEmbedding(question),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Embedding generation timeout")), 10000)
            ),
        ]);

        const typeDocuments = await fetchTypeDocuments(questionEmbedding, effectiveMatchCount);

        if (!typeDocuments?.length) {
            console.warn("No type documents found, using fallback classification");
            return await fallbackClassification(question);
        }

        const bestMatch = typeDocuments[0];

        // Combine smart routing keywords with semantic results
        const combinedKeywords = [
            ...(smartResult?.detectedKeywords || []),
            ...extractKeywords(question),
        ];

        // Check if semantic result aligns with smart routing
        if (smartResult?.suggestedType &&
            smartResult.suggestedType !== bestMatch.document_type) {
            console.warn(
                `Smart routing suggested ${smartResult.suggestedType} but semantic found ${bestMatch.document_type}`
            );
        }

        if ((bestMatch.type_similarity || 0) < minConfidence) {
            console.warn(
                `Best match confidence (${bestMatch.type_similarity}) below threshold (${minConfidence})`
            );
            return await fallbackClassification(question);
        }

        const relevantDocuments = await fetchRelevantDocuments(
            bestMatch.document_type,
            relevantDocsLimit
        );

        return {
            ...buildRoutedQuestion(question, bestMatch, relevantDocuments),
            matchedKeywords: Array.from(new Set(combinedKeywords)),
        };
    } catch (error) {
        console.error("Semantic Classification Error:", {
            question: question.substring(0, 100),
            smartResult: smartResult?.suggestedType,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });

        return await fallbackClassification(question);
    }
}

/**
 * Fetches documents with type similarity scores
 */
async function fetchTypeDocuments(
    queryEmbedding: number[],
    matchCount: number
): Promise<TypeDocument[]> {
    const { data, error } = await supabase.rpc("match_documents_with_type", {
        query_embedding: queryEmbedding,
        match_count: matchCount,
    });

    if (error) {
        throw new SemanticClassificationError(
            `Failed to fetch type documents: ${error.message}`,
            error
        );
    }

    return data || [];
}

/**
 * Fetches relevant documents for a specific document type
 */
async function fetchRelevantDocuments(
    documentType: string,
    limit: number
): Promise<SpiritualDocument[]> {
    const { data, error } = await supabase
        .from("spiritual_documents")
        .select("id, type, content, title, description, document_type, metadata")
        .eq("document_type", documentType)
        .order("created_at", { ascending: false }) // Get most recent documents
        .limit(limit);

    if (error) {
        console.error("Error fetching relevant documents:", error);
        return []; // Return empty array instead of throwing - non-critical error
    }

    return data || [];
}

/**
 * Builds the final RoutedQuestion object
 */
function buildRoutedQuestion(
    question: string,
    bestMatch: TypeDocument,
    documents: SpiritualDocument[]
): RoutedQuestion {
    return {
        documentType: bestMatch.document_type,
        confidence: bestMatch.type_similarity || DEFAULT_CONFIDENCE,
        question: question.trim(),
        relevantDocuments: documents.map(mapDocumentToRelevant),
        reasoning: buildReasoning(bestMatch),
        matchedKeywords: extractKeywords(question),
    };
}

/**
 * Maps a SpiritualDocument to the format expected in RoutedQuestion
 */
function mapDocumentToRelevant(doc: SpiritualDocument) {
    return {
        id: doc.id,
        type: doc.type,
        content: doc.content,
        title: doc.title,
        description: doc.description,
    };
}

/**
 * Builds a human-readable reasoning string
 */
function buildReasoning(bestMatch: TypeDocument): string {
    const similarity = ((bestMatch.type_similarity || 0) * 100).toFixed(1);
    return `Semantic similarity match with ${similarity}% confidence for ${bestMatch.document_type}`;
}

/**
 * Extracts potential keywords from question that might have matched
 * This is a placeholder - implement based on your needs
 */
function extractKeywords(question: string): string[] {
    // Simple implementation - extract words longer than 3 characters
    const words = question.toLowerCase().split(/\W+/);
    return words.filter((word) => word.length > 3).slice(0, 5);
}

// Export for testing
export const _testing = {
    fetchTypeDocuments,
    fetchRelevantDocuments,
    buildRoutedQuestion,
    extractKeywords,
};