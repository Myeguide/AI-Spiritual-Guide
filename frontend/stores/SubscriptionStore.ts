import { create } from 'zustand';
import { SubscriptionStatus } from '@/types/plan';

interface SubscriptionState {
    subscriptionStatus: SubscriptionStatus | null;
    currentPlan: string;
    showExpiredMessage: boolean;

    // Actions
    setSubscriptionStatus: (status: SubscriptionStatus | null) => void;
    setCurrentPlan: (plan: string) => void;
    setShowExpiredMessage: (show: boolean) => void;
    clearSubscription: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
    subscriptionStatus: null,
    currentPlan: '',
    showExpiredMessage: false,

    setSubscriptionStatus: (status) => {
        set({ subscriptionStatus: status });
        if (status) {
            set({
                currentPlan: status.subscription?.planType || '',
                showExpiredMessage: status.hasActiveSubscription === false
            });
        }
    },

    setCurrentPlan: (plan) =>
        set({ currentPlan: plan }),

    setShowExpiredMessage: (show) =>
        set({ showExpiredMessage: show }),

    clearSubscription: () =>
        set({
            subscriptionStatus: null,
            currentPlan: '',
            showExpiredMessage: false
        }),
}));