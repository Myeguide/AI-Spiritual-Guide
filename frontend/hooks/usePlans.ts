import { useEffect } from 'react';
import { usePlanStore } from '@/frontend/stores/PlanStore';
import { apiCall } from '@/utils/api-call';
import { planExtras } from '@/types/plan';

export const usePlans = () => {
    const {
        plans,
        isLoading,
        error,
        setPlans,
        setLoading,
        setError,
        shouldRefetch
    } = usePlanStore();

    useEffect(() => {
        const fetchPlans = async () => {
            // Check if we need to refetch
            if (!shouldRefetch()) {
                return;
            }

            setLoading(true);
            try {
                const response = await apiCall("/api/subscription-tier", "GET");

                if (!response.success) {
                    throw new Error(`Failed to fetch plans: ${response.statusText}`);
                }

                const plansWithExtras = response.data.map(
                    (item: any) => ({
                        ...item,
                        ...(planExtras.find((plan) => item.type === plan.planType) || {}),
                    })
                );

                setPlans(plansWithExtras);
            } catch (error) {
                console.error("Error fetching plans:", error);
                setError(error instanceof Error ? error.message : 'Failed to fetch plans');
            } finally {
                setLoading(false);
            }
        };

        fetchPlans();
    }, [shouldRefetch, setPlans, setLoading, setError]);

    return { plans, isLoading, error };
};