import { useState, useEffect } from 'react';
import {
    PaymentMethodResponse,
    CreatePaymentMethodDTO,
    UpdatePaymentMethodDTO,
    ApiResponse,
    PaymentMethodListResponse,
} from '@/types/payment';
import { apiCall } from '@/utils/api-call';

export function usePaymentMethods() {
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodResponse[]>([]);
    const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPaymentMethods = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiCall('/api/payment-methods', 'GET');
            const data: ApiResponse<PaymentMethodListResponse> = response;

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch payment methods');
            }

            setPaymentMethods(data.data!.paymentMethods);
            setDefaultPaymentMethodId(data.data!.defaultPaymentMethodId);
        } catch (err: any) {
            setError(err.message);
            console.error('Error fetching payment methods:', err);
        } finally {
            setLoading(false);
        }
    };

    const addPaymentMethod = async (data: CreatePaymentMethodDTO) => {
        try {
            const response = await apiCall('/api/payment-methods', 'POST', data);

            const result: ApiResponse<PaymentMethodResponse> = response;

            if (!result.success) {
                throw new Error(result.error || 'Failed to add payment method');
            }

            await fetchPaymentMethods();
            return result.data!;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const updatePaymentMethod = async (id: string, data: UpdatePaymentMethodDTO) => {
        try {
            const response = await apiCall(`/api/payment-methods/${id}`, 'PATCH', data);

            const result: ApiResponse<PaymentMethodResponse> = response;

            if (!result.success) {
                throw new Error(result.error || 'Failed to update payment method');
            }

            await fetchPaymentMethods();
            return result.data!;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const setDefaultPaymentMethod = async (id: string) => {
        try {
            const response = await apiCall(`/api/payment-methods/${id}/set-default`, 'POST');

            const result: ApiResponse<PaymentMethodResponse> = response;

            if (!result.success) {
                throw new Error(result.error || 'Failed to set default payment method');
            }

            await fetchPaymentMethods();
            return result.data!;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const deletePaymentMethod = async (id: string) => {
        try {
            const response = await apiCall(`/api/payment-methods/${id}`, 'DELETE');

            const result: ApiResponse = response;

            if (!result.success) {
                throw new Error(result.error || 'Failed to delete payment method');
            }

            await fetchPaymentMethods();
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    useEffect(() => {
        fetchPaymentMethods();
    }, []);

    return {
        paymentMethods,
        defaultPaymentMethodId,
        loading,
        error,
        refetch: fetchPaymentMethods,
        addPaymentMethod,
        updatePaymentMethod,
        setDefaultPaymentMethod,
        deletePaymentMethod,
    };
}