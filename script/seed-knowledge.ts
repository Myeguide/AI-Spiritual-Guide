import { generateEmbedding } from "@/lib/generate-embedding";
import { supabase } from "@/lib/supabase";
import { documentTypes, SpiritualDocument } from "@/types/document";

export async function storeDocument(
    title: string,
    description: string,
    content: string,
    documentType: string
): Promise<SpiritualDocument> {
    try {
        if (!documentTypes.includes(documentType.toLowerCase())) {
            throw new Error(
                `Invalid document type. Allowed types: ${documentTypes.join(", ")}`
            );
        }

        const embedding = await generateEmbedding(content);

        const { data, error } = await supabase
            .from("spiritual_documents")
            .insert({
                title,
                description,
                content,
                document_type: documentType.toLowerCase(),
                embedding,
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;

        await updateTypeEmbeddings();

        return {
            id: data.id,
            type: data.document_type,
            content: data.content,
            title: data.title,
            description: data.description,
        };
    } catch (error: unknown) {
        console.error("Store Document Error:", error);
        throw new Error("Failed to store document");
    }
}

async function updateTypeEmbeddings(): Promise<void> {
    try {
        const { error } = await supabase.rpc("update_type_embeddings");
        if (error) {
            console.warn("Type embeddings update warning:", error);
        }
    } catch (error: unknown) {
        console.warn("Could not update type embeddings:", error);
    }
}