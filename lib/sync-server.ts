import { db } from "@/frontend/dexie/db";
import { clearAllUserData } from "@/frontend/dexie/queries";
import { apiCall } from "@/utils/api-call";

/**
 * Main sync function - syncs all user data from server to IndexedDB
 * Uses bulk API for optimal performance
 */
export const syncDataFromServer = async () => {
    try {

        // Step 1: Fetch all threads for current user
        const threadsResponse = await apiCall(`/api/threads`, "GET");

        // Handle new users or errors gracefully
        if (!threadsResponse.success) {
            if (threadsResponse.status === 404 || !threadsResponse.threads) {
                await clearAllUserData();
                return;
            }
            throw new Error(threadsResponse.error || "Failed to fetch threads");
        }
        const serverThreads = threadsResponse.threads || [];

        // Early return if no data on server
        if (serverThreads.length === 0) {
            await clearAllUserData();
            return;
        }

        // Step 2: Sync threads to IndexedDB (server is source of truth)
        // NOTE: We no longer upload local-only threads to prevent deleted threads from resurrecting
        // If offline support is needed in the future, implement a proper deletion tracking mechanism
        await db.transaction("rw", [db.threads], async () => {
            await db.threads.clear();

            for (const serverThread of serverThreads) {
                await db.threads.put({
                    id: serverThread.id,
                    title: serverThread.title,
                    createdAt: new Date(serverThread.createdAt),
                    updatedAt: new Date(serverThread.updatedAt),
                    lastMessageAt: new Date(serverThread.lastMessageAt),
                });
            }
        });

        // Step 3: Fetch ALL messages for ALL threads in ONE request (bulk)
        const messagesResponse = await apiCall(`/api/messages/bulk`, "GET");

        if (!messagesResponse.success) {
            console.error("Failed to fetch bulk messages");
            // Don't throw - threads are synced, messages can be loaded later
            return;
        }

        const messagesByThread = messagesResponse.messagesByThread || {};

        // Step 4: Sync all messages to IndexedDB (server is source of truth)
        await db.transaction("rw", [db.messages], async () => {
            await db.messages.clear();

            // Insert all messages
            for (const threadId in messagesByThread) {
                const messages = messagesByThread[threadId];
                for (const msg of messages) {
                    await db.messages.put({
                        id: msg.id,
                        threadId: msg.threadId,
                        parts: msg.parts,
                        role: msg.role,
                        content: msg.content,
                        createdAt: new Date(msg.createdAt),
                    });
                }
            }
        });
    } catch (error) {
        console.error("❌ Error during data sync:", error);
        // On critical error, clear potentially stale data
        await clearAllUserData().catch(console.error);
        throw error; // Re-throw to handle in caller
    }
};

/**
 * Sync messages for a specific thread (on-demand loading)
 * Use this when opening a thread that hasn't been synced yet
 */
export const syncThreadMessagesOnDemand = async (threadId: string) => {
    try {
        // Check if messages already exist locally
        const localMessageCount = await db.messages
            .where("threadId")
            .equals(threadId)
            .count();

        if (localMessageCount > 0) {
            return;
        }

        // Fetch messages from server
        const messagesResponse = await apiCall(
            `/api/messages?threadId=${threadId}`,
            "GET"
        );

        if (!messagesResponse.success) {
            console.error(`Failed to fetch messages for thread ${threadId}`);
            throw new Error("Failed to fetch messages");
        }

        const serverMessages = messagesResponse.messages || [];
        if (serverMessages.length === 0) {
            return;
        }

        // Save to IndexedDB
        await db.transaction("rw", [db.messages], async () => {
            for (const msg of serverMessages) {
                await db.messages.put({
                    id: msg.id,
                    threadId: msg.threadId,
                    parts: msg.parts,
                    role: msg.role,
                    content: msg.content,
                    createdAt: new Date(msg.createdAt),
                });
            }
        });
    } catch (error) {
        console.error(`❌ Error syncing messages for thread ${threadId}:`, error);
        throw error;
    }
};