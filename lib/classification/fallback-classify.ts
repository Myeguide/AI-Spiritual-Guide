import { RoutedQuestion } from "@/types/question";
import { supabase } from "../supabase";
import { SpiritualDocument } from "@/types/document";

export async function fallbackClassification(question: string): Promise<RoutedQuestion> {
    const lowerQuestion = question.toLowerCase();

    const keywordMap: Record<string, string[]> = {
        "emotional_spiritual": [
            "forgiv", "anger", "fear", "anxie", "sad", "grief", "trauma",
            "emotion", "heal", "peace", "hurt", "pain", "stress", "worry",
            "depres", "overwhelm", "struggle", "suffer"
        ],
        "about_god": [
            "god", "divine", "lord", "creator", "brahman", "supreme",
            "deity", "sacred", "worship", "prayer", "faith", "belief"
        ],
        "practical_techniques": [
            "meditat", "breath", "yoga", "pranayam", "asana", "technique",
            "practice", "method", "exercise", "ritual", "mantra"
        ],
        "astrology": [
            "astrol", "zodiac", "planet", "star", "horoscope", "birth chart",
            "saturn", "jupiter", "moon", "sun", "rahu", "ketu"
        ],
        "sex_marriage_intimacy_desire": [
            "sex", "intimat", "partner", "marriage", "relation", "desire",
            "love", "attract", "passion", "couple", "husband", "wife", "sensual"
        ],
        "afterlife_cosmic_process": [
            "afterlife", "death", "rebirth", "reincarn", "soul", "spirit",
            "next life", "beyond", "cosmos", "universe", "eternal"
        ],
        "dharma_smrti_law": [
            "dharma", "dharmic", "duty", "law", "right", "ethics",
            "moral", "conduct", "principle", "righteousness"
        ],
        "ayurveda_health": [
            "ayurveda", "dosha", "vata", "pitta", "kapha", "health",
            "heal", "medicine", "cure", "body", "physical", "disease"
        ],
        "sages_saints_deities": [
            "sage", "saint", "rishi", "guru", "master", "krishna", "rama",
            "buddha", "shiva", "vishnu", "devi", "shakti", "lord"
        ],
        "children_youth": [
            "child", "children", "youth", "young", "parent", "father",
            "mother", "kid", "family", "upbring", "education", "school"
        ],
        "vedic_observance_rituals_dates": [
            "ritual", "observ", "puja", "festival", "date", "fast",
            "cerem", "rite", "worship", "pooja", "vedic", "veda"
        ],
        "definition_concept_spiritual_clarification": [
            "what is", "what are", "definit", "concept", "meaning",
            "clarif", "understand", "explain", "describe", "nature of"
        ],
        "comparative_theological": [
            "compar", "differ", "similar", "tradition", "religion",
            "scripture", "text", "teaching", "philosophy", "compare"
        ]
    };

    let matchedType = "";
    let bestScore = 0;

    for (const [docType, keywords] of Object.entries(keywordMap)) {
        let score = 0;
        for (const keyword of keywords) {
            if (lowerQuestion.includes(keyword)) {
                score++;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            matchedType = docType;
        }
    }

    const { data: relevantDocuments, error } = await supabase
        .from("spiritual_documents")
        .select("*")
        .eq("document_type", matchedType)
        .limit(3);

    if (error) throw error;

    return {
        documentType: matchedType,
        confidence: bestScore > 0 ? 0.6 + (bestScore * 0.1) : 0.5,
        question,
        relevantDocuments: (relevantDocuments || []).map((doc: SpiritualDocument) => ({
            id: doc.id,
            type: doc.type,
            content: doc.content,
            title: doc.title,
            description: doc.description,
        })),
        reasoning: "Using fallback keyword matching",
        matchedKeywords: [],
    };
}