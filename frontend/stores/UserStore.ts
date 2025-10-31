// store/userStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/user";

interface SubscriptionInfo {
    hasActiveSubscription: boolean;
    expiresAt: Date | null;
}

interface IAuth {
    user: User | null;
    loading: boolean;
    token: string | null;
    subscription: SubscriptionInfo;

    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    setToken: (token: string | null) => void;
    setSubscription: (subscription: Partial<SubscriptionInfo>) => void;
    fetchSubscription: () => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: () => boolean;
}

// create the store — let zustand's types infer everything by using the generic persist<IAuth>
export const useUserStore = create<IAuth>()(
    persist(
        (set, get) => ({
            user: null,
            loading: false,
            token: null,
            subscription: {
                hasActiveSubscription: false,
                expiresAt: null,
            },

            setUser: (user) => set({ user }),
            setLoading: (loading) => set({ loading }),
            setToken: (token) => set({ token }),

            setSubscription: (subscriptionData) =>
                set((state) => ({
                    subscription: { ...state.subscription, ...subscriptionData },
                })),

            fetchSubscription: async () => {
                try {
                    const { token, user } = get();
                    if (!token || !user?.id) return;

                    const response = await fetch(`/api/subscription/status?userId=${user.id}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });

                    const data = await response.json();

                    if (data.success) {
                        set({
                            subscription: {
                                hasActiveSubscription: data.hasActiveSubscription,
                                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
                            },
                        });
                    }
                } catch (error) {
                    console.error("Failed to fetch subscription:", error);
                }
            },


            logout: async () => {
                try {
                    const res = await fetch("/api/logout", {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${get().token}`,
                        },
                    });
                    if (res.status === 200) {
                        set({
                            user: null,
                            token: null,
                            loading: false,
                            subscription: {
                                hasActiveSubscription: false,
                                expiresAt: null,
                            },
                        });
                    } else {
                        console.error("Logout failed:", res.status);
                    }
                } catch (e) {
                    console.error("Logout error:", e);
                }
            },

            isAuthenticated: () => {
                const { user, token } = get();
                return !!user && !!token;
            },
        }),
        {
            name: "user-storage",
            partialize: (state) => ({
                user: state.user,
                token: state.token,
            }),
        }
    )
);