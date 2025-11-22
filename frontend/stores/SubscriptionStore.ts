import { create } from 'zustand';
import { Subscription } from '@/types/plan';

interface SubscriptionState {
    subscription: Subscription | null;
    currentPlan: string;
    showExpiredMessage: boolean;

    // Actions
    setSubscription: (subs: Subscription | null) => void;
    setCurrentPlan: (plan: string) => void;
    setShowExpiredMessage: (show: boolean) => void;
    clearSubscription: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
    subscription: null,
    currentPlan: '',
    showExpiredMessage: false,

    setSubscription: (subs) => {
        set({
            subscription: subs
        });
        if (subs) {
            set({
                currentPlan: subs?.subscription?.planType || '',
                showExpiredMessage: subs?.hasActiveSubscription === false
            });
        }
    },

    setCurrentPlan: (plan) =>
        set({ currentPlan: plan }),

    setShowExpiredMessage: (show) =>
        set({ showExpiredMessage: show }),

    clearSubscription: () =>
        set({
            subscription: null,
            currentPlan: '',
            showExpiredMessage: false
        }),
}));