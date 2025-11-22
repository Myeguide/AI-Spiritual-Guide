// store/userStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LoggedInUser } from "@/types/user";
import { clearAllUserData } from "../dexie/queries";

interface SubscriptionInfo {
    hasActiveSubscription: boolean;
    expiresAt: Date | null;
}

interface IAuth {
    user: LoggedInUser | null;
    currentUserId: string | null;
    loading: boolean;
    token: string | null;
    subscription: SubscriptionInfo;
    subscriptionFetched: boolean;
    subscriptionLoading: boolean;

    setUser: (user: LoggedInUser) => void;
    updateUser: (udpates: Partial<LoggedInUser>) => void;
    setLoading: (loading: boolean) => void;
    setToken: (token: string | null) => void;
    setSubscription: (subscription: Partial<SubscriptionInfo>) => void;
    fetchSubscription: () => Promise<void>;
    logout: () => void;
    isAuthenticated: () => boolean;
}

// create the store — let zustand's types infer everything by using the generic persist<IAuth>
export const useUserStore = create<IAuth>()(
    persist(
        (set, get) => ({
            user: null,
            currentUserId: null,
            loading: false,
            token: null,
            subscription: {
                hasActiveSubscription: false,
                expiresAt: null,
            },
            subscriptionLoading: false,
            subscriptionFetched: false,

            setUser: (user: LoggedInUser) => {
                const previousUserId = get().currentUserId;
                const newUserId = user.id;

                // Check if user changed
                if (previousUserId && previousUserId !== newUserId) {
                    // Clear old user's data from IndexedDB
                    clearAllUserData().catch(console.error);
                }
                set({ user, currentUserId: newUserId });
            },
            updateUser: (updates: Partial<LoggedInUser>) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...updates } : null,
                })),
            setLoading: (loading) => set({ loading }),
            setToken: (token) => set({ token }),

            setSubscription: (subscriptionData) =>
                set((state) => ({
                    subscription: { ...state.subscription, ...subscriptionData },
                })),

            fetchSubscription: async () => {
                 set({ subscriptionLoading: true });
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
                                hasActiveSubscription: data.data.hasActiveSubscription,
                                expiresAt: data.data.expiresAt ? new Date(data.data.expiresAt) : null,
                            },
                             subscriptionFetched: true,
                        });
                    }
                } catch (error) {
                    console.error("Failed to fetch subscription:", error);
                }finally{
                    set({ subscriptionLoading: false });
                }
            },


            logout: () => {
                clearAllUserData().catch(console.error);
                set({ user: null, token: null, currentUserId: null });
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
                subscription: state.subscription,
            }),
        }
    )
);