import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Plan } from '@/types/plan';

interface PlanState {
    plans: Plan[];
    lastFetched: number | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    setPlans: (plans: Plan[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearCache: () => void;
    shouldRefetch: () => boolean;
}

const CACHE_DURATION = 5 * 60 * 1000;

export const usePlanStore = create<PlanState>()(
    persist(
        (set, get) => ({
            plans: [],
            lastFetched: null,
            isLoading: false,
            error: null,

            setPlans: (plans) =>
                set({
                    plans,
                    lastFetched: Date.now(),
                    error: null
                }),

            setLoading: (loading) =>
                set({ isLoading: loading }),

            setError: (error) =>
                set({ error, isLoading: false }),

            clearCache: () =>
                set({
                    plans: [],
                    lastFetched: null,
                    error: null
                }),

            shouldRefetch: () => {
                const { lastFetched, plans } = get();
                if (!lastFetched || plans.length === 0) return true;
                return Date.now() - lastFetched > CACHE_DURATION;
            },
        }),
        {
            name: 'plan-storage', // localStorage key
            partialize: (state) => ({
                plans: state.plans,
                lastFetched: state.lastFetched
            }), // Only persist these fields
        }
    )
);