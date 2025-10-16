import { SpiritualDocument } from "./document";

export type RoutedQuestion = {
    documentType: string;
    confidence: number;
    question: string;
    relevantDocuments: SpiritualDocument[];
    reasoning?: string;
    matchedKeywords?: string[];
}