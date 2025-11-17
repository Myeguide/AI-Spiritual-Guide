import { useCallback } from 'react';

declare global {
    interface Window {
        Razorpay: any;
    }
}

export interface RazorpayOptions {
    amount: number;
    currency: string;
    name: string;
    description?: string;
    image?: string;
    orderId: string;
    prefill?: {
        name?: string;
        email?: string;
        contact?: string;
    };
    theme?: {
        color?: string;
    };
    onSuccess: (response: any) => void;
    onFailure?: (error: any) => void;
}

export function useRazorpay() {
    const loadRazorpayScript = useCallback(() => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    }, []);

    const openRazorpay = useCallback(
        async (options: RazorpayOptions) => {
            const loaded = await loadRazorpayScript();
            if (!loaded) {
                alert('Failed to load Razorpay SDK. Please check your internet connection.');
                return;
            }

            const razorpayOptions = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: options.amount,
                currency: options.currency,
                name: options.name,
                description: options.description,
                image: options.image,
                order_id: options.orderId,
                handler: options.onSuccess,
                prefill: options.prefill,
                theme: options.theme,
                modal: {
                    ondismiss: () => {
                        console.log('Payment modal closed');
                    },
                },
            };

            const paymentObject = new window.Razorpay(razorpayOptions);

            paymentObject.on('payment.failed', (response: any) => {
                if (options.onFailure) {
                    options.onFailure(response.error);
                }
            });

            paymentObject.open();
        },
        [loadRazorpayScript]
    );

    return { openRazorpay };
}
