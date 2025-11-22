import { intelligentClassify } from "./intelligent-classify";
import { ClassificationResult, llmClassify, loadTemplate } from "./classify-helper";

export async function classifyQuestion(question: string): Promise<ClassificationResult> {
    try {
        // STEP 1: Try rule-based classification
        let classification = intelligentClassify(question);

        console.log("Rule-based classification:", {
            type: classification.type,
            confidence: classification.confidence,
            keywords: classification.keywords
        });

        // STEP 2: If low confidence or empty type, use LLM
        if (!classification.type || classification.confidence < 0.7) {
            console.log("Low confidence, using LLM fallback...");
            const llmResult = await llmClassify(question);

            classification = {
                type: llmResult.type,
                confidence: llmResult.confidence,
                reasoning: llmResult.reasoning,
                keywords: classification.keywords, // Keep detected keywords
            };
        }

        // STEP 3: Load template from file
        let templateContent = ''
        if (classification.type != 'general') {
            templateContent = loadTemplate(classification.type);
        }


        return {
            documentType: classification.type || "general",
            confidence: classification.confidence,
            question: question.trim(),
            templateContent,
            reasoning: classification.reasoning,
            matchedKeywords: classification.keywords,
        };

    } catch (error) {
        console.error("Classification error:", error);

        // Ultimate fallback
        return {
            documentType: "general",
            confidence: 0.5,
            question: question.trim(),
            templateContent: loadTemplate("general"),
            reasoning: "Error occurred, using general template",
            matchedKeywords: [],
        };
    }
}

