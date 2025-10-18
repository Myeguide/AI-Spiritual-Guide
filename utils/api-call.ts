export const apiCall = async (endpoint: string, method: string, body: object) => {
    const res = await fetch(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error || "Request failed");
    }
    return data;
};