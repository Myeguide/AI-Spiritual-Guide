import { db } from "@/frontend/dexie/db";
import { apiCall } from "@/utils/api-call";

export const syncDataFromServer = async () => {
    try {
        // Step 1: Fetch all threads from server
        const threadsResponse = await apiCall(`/api/threads`, "GET");

        if (!threadsResponse.success) {
            console.error("Failed to fetch threads:", threadsResponse.statusText);
            return;
        }
        const serverThreads = threadsResponse.threads || [];

        // Step 2: Get all local threads
        const localThreads = await db.threads.toArray();
        new Map(localThreads.map((t) => [t.id, t]));

        // Step 3: Upload any local-only threads to server (edge case: offline created threads)
        for (const localThread of localThreads) {

            const serverHasThread = serverThreads.some((t: any) => t.id === localThread.id);

            if (!serverHasThread) {
                try {
                    await apiCall("/api/threads", "POST", {
                        threadId: localThread.id,
                        title: localThread.title,
                    })
                    // Upload messages for this local-only thread
                    await uploadLocalMessagesForThread(localThread.id);
                } catch (error) {
                    console.error(`Failed to upload thread ${localThread.id}:`, error);
                }
            }
        }

        // Step 4: Download ALL threads from server to IndexedDB
        await db.transaction("rw", [db.threads], async () => {
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

        // Step 5: Delete local threads that don't exist on server (cleanup)

        const serverThreadIds = new Set(serverThreads.map((t: any) => t.id));
        for (const localThread of localThreads) {
            if (!serverThreadIds.has(localThread.id)) {
                await db.threads.delete(localThread.id);
                // Also delete associated messages
                await db.messages.where("threadId").equals(localThread.id).delete();
            }
        }

        // Step 6: Sync messages for ALL threads
        for (const serverThread of serverThreads) {
            await syncMessagesForThread(serverThread.id);
        }
    } catch (error) {
        console.error("❌ Error during data sync:", error);
    }
};// Upload local-only messages for a thread
const uploadLocalMessagesForThread = async (
    threadId: string,
) => {
    try {
        const localMessages = await db.messages
            .where("threadId")
            .equals(threadId)
            .toArray();

        for (const localMsg of localMessages) {
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
                })
            } catch (error) {
                console.error(`Failed to upload message ${localMsg.id}:`, error);
            }
        }
    } catch (error) {
        console.error(`Error uploading messages for thread ${threadId}:`, error);
    }
};


// Sync messages for a thread (server is source of truth)
const syncMessagesForThread = async (
    threadId: string
) => {
    try {
        // Step 1: Fetch ALL messages from server for this thread
        const messagesResponse = await apiCall(`/api/messages?threadId=${threadId}`, "GET");

        if (!messagesResponse.success) {
            console.error("Failed to fetch messages:", messagesResponse.statusText);
            return;
        }

        const serverMessages = messagesResponse.messages || [];

        // Step 2: Get local messages for this thread
        const localMessages = await db.messages
            .where("threadId")
            .equals(threadId)
            .toArray();

        const localMessagesMap = new Map(localMessages.map((m) => [m.id, m]));

        const serverMessagesMap = new Map(serverMessages.map((m: any) => [m.id, m]));

        // Step 3: Upload local-only messages to server (edge case: offline messages)
        for (const localMsg of localMessages) {
            if (!serverMessagesMap.has(localMsg.id)) {
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
                    })
                } catch (error) {
                    console.error(`Failed to upload message ${localMsg.id}:`, error);
                }
            }
        }

        // Step 4: Download messages from server that aren't in IndexedDB
        const messagesToDownload = serverMessages.filter(

            (msg: any) => !localMessagesMap.has(msg.id)
        );

        if (messagesToDownload.length > 0) {
            await db.transaction("rw", [db.messages], async () => {
                for (const msg of messagesToDownload) {
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
        }

        // Step 5: Delete local messages that don't exist on server (cleanup)

        const serverMessageIds = new Set(serverMessages.map((m: any) => m.id));
        for (const localMsg of localMessages) {
            if (!serverMessageIds.has(localMsg.id)) {
                await db.messages.delete(localMsg.id);
            }
        }
    } catch (error) {
        console.error(`❌ Error syncing messages for thread ${threadId}:`, error);
    }
};