import { useUserStore } from "@/frontend/stores/UserStore";

export const apiCall = async (endpoint: string, method: string, body?: any) => {
    const token = useUserStore.getState().token;
    const res = await fetch(endpoint, {
        method: method,
        headers: {
            "Content-Type": "application/json",
            ...(token && { "Authorization": `Bearer ${token}` })
        },
        credentials: "include",
        body: JSON.stringify(body),
    });
    
    // Handle 401 Unauthorized - session expired
    if (res.status === 401) {
        useUserStore.getState().logout();
        // Optionally redirect to login or let the app handle it
        window.location.href = "/chat";
        throw new Error("Session expired. Please login again.");
    }
    
    const data = await res.json();

    return data;
};