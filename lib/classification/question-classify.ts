import { RoutedQuestion } from "@/types/question";
import { supabase } from "../supabase";
import { intelligentClassify } from "./intelligent-classify";
import { semanticClassification } from "./semantic-classfy";
import { fallbackClassification } from "./fallback-classify";
import { SpiritualDocument } from "@/types/document";

export async function classifyQuestion(question: string): Promise<RoutedQuestion> {
    try {
        // STEP 1: Use intelligent rule-based classification first
        const smartResult = intelligentClassify(question);

        // STEP 2: Get documents of the classified type
        const { data: relevantDocuments, error: docError } = await supabase
            .from("spiritual_documents")
            .select("*")
            .eq("document_type", smartResult.type)
            .limit(5);

        if (docError) throw docError;

        // If documents found, return immediately
        if (relevantDocuments && relevantDocuments.length > 0) {
            return {
                documentType: smartResult.type,
                confidence: smartResult.confidence,
                question,
                relevantDocuments: relevantDocuments.map((doc: SpiritualDocument) => ({
                    id: doc.id,
                    type: doc.type,
                    content: doc.content,
                    title: doc.title,
                    description: doc.description,
                })),
                reasoning: smartResult.reasoning,
                matchedKeywords: smartResult.keywords,
            };
        }

        // STEP 3: If no documents found, try semantic search as fallback
        return await semanticClassification(question, smartResult);

    } catch (error: unknown) {
        console.error("Classification Error:", error);
        return await fallbackClassification(question);
    }
}