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
    const data = await res.json();

    return data;
};