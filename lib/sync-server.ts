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

        // Step 2: Upload local-only threads to server (offline-created threads)
        const localThreads = await db.threads.toArray();
        const serverThreadIds = new Set(serverThreads.map((t: any) => t.id));

        for (const localThread of localThreads) {
            if (!serverThreadIds.has(localThread.id)) {
                try {
                    await apiCall("/api/threads", "POST", {
                        threadId: localThread.id,
                        title: localThread.title,
                    });

                    // Upload messages for this thread
                    await uploadLocalMessagesForThread(localThread.id);
                } catch (error) {
                    console.error(`Failed to upload thread ${localThread.id}:`, error);
                }
            }
        }

        // Step 3: Sync threads to IndexedDB (replace all)
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

        // Step 4: Fetch ALL messages for ALL threads in ONE request (bulk)
        const messagesResponse = await apiCall(`/api/messages/bulk`, "GET");

        if (!messagesResponse.success) {
            console.error("Failed to fetch bulk messages");
            // Don't throw - threads are synced, messages can be loaded later
            return;
        }

        const messagesByThread = messagesResponse.messagesByThread || {};
        const totalMessages = messagesResponse.totalMessages || 0;

        // Step 5: Upload local-only messages to server
        const localMessages = await db.messages.toArray();
        const serverMessageIds = new Set();

        for (const threadId in messagesByThread) {
            messagesByThread[threadId].forEach((msg: any) => {
                serverMessageIds.add(msg.id);
            });
        }

        const localOnlyMessages = localMessages.filter(msg => !serverMessageIds.has(msg.id));

        if (localOnlyMessages.length > 0) {
            await uploadLocalMessages(localOnlyMessages);
        }

        // Step 6: Sync all messages to IndexedDB (replace all)
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
 * Upload local-only messages in bulk for a specific thread
 */
const uploadLocalMessagesForThread = async (threadId: string) => {
    try {
        const localMessages = await db.messages
            .where("threadId")
            .equals(threadId)
            .toArray();

        if (localMessages.length === 0) {
            return;
        }

        // Upload in batches to avoid overwhelming the server
        const BATCH_SIZE = 10;
        for (let i = 0; i < localMessages.length; i += BATCH_SIZE) {
            const batch = localMessages.slice(i, i + BATCH_SIZE);

            await Promise.all(
                batch.map(async (localMsg) => {
                    try {
                        await apiCall("/api/messages", "POST", {
                            threadId,
                            message: {
                                id: localMsg.id,
                                content: localMsg.content,
                                parts: localMsg.parts,
                                role: localMsg.role,
                                createdAt: localMsg.createdAt,
                            },
                        });
                    } catch (error) {
                        console.error(`Failed to upload message ${localMsg.id}:`, error);
                    }
                })
            );
        }
    } catch (error) {
        console.error(`Error uploading messages for thread ${threadId}:`, error);
    }
};

/**
 * Upload local-only messages in bulk (all threads)
 */
const uploadLocalMessages = async (messages: any[]) => {
    try {
        // Group messages by thread for better organization
        const messagesByThread = messages.reduce((acc: any, msg) => {
            if (!acc[msg.threadId]) {
                acc[msg.threadId] = [];
            }
            acc[msg.threadId].push(msg);
            return acc;
        }, {});

        // Upload messages for each thread
        for (const threadId in messagesByThread) {
            const threadMessages = messagesByThread[threadId];

            // Upload in batches
            const BATCH_SIZE = 10;
            for (let i = 0; i < threadMessages.length; i += BATCH_SIZE) {
                const batch = threadMessages.slice(i, i + BATCH_SIZE);

                await Promise.all(
                    batch.map(async (msg: any) => {
                        try {
                            await apiCall("/api/messages", "POST", {
                                threadId,
                                message: {
                                    id: msg.id,
                                    content: msg.content,
                                    parts: msg.parts,
                                    role: msg.role,
                                    createdAt: msg.createdAt,
                                },
                            });
                        } catch (error) {
                            console.error(`Failed to upload message ${msg.id}:`, error);
                        }
                    })
                );
            }
        }
    } catch (error) {
        console.error("Error uploading local messages:", error);
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