import { User } from "@/types/user";
import { create, Mutate, StoreApi } from "zustand";
import { persist } from 'zustand/middleware';

interface IAuth {
    user: User | null;
    loading: boolean;
    token: string | null;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    setToken: (token: string | null) => void;
    logout: () => void;
    isAuthenticated: () => boolean;
}

type StoreWithPersist = Mutate<
    StoreApi<IAuth>,
    [['zustand/persist', { user: User | null; token: string | null }]]
>;

export const withStorageDOMEvents = (store: StoreWithPersist) => {
    const storageEventCallback = (e: StorageEvent) => {
        if (e.key === store.persist.getOptions().name && e.newValue) {
            store.persist.rehydrate();
        }
    }

    window.addEventListener('storage', storageEventCallback);

    return () => {
        window.removeEventListener('storage', storageEventCallback);
    };
}

export const useUserStore = create<IAuth>()(
    persist(
        (set, get) => ({
            user: null,
            loading: false,
            token: null,
            setUser: (user) => set({ user }),
            setLoading: (loading) => set({ loading }),
            setToken: (token) => set({ token }),
            logout: async () => {
                try {
                    const res = await fetch("/api/logout", {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${get().token}`,
                        },
                    });
                    if (res.status === 200) {
                        set({ user: null, token: null, loading: false });
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
            }
        }),
        {
            name: 'user-storage',
            partialize: (state) => ({ user: state.user, token: state.token }) // only persist user and token
        }
    )
)

withStorageDOMEvents(useUserStore);