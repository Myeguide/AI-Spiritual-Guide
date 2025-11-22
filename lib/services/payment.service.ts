import {
    CreatePaymentMethodDTO,
    UpdatePaymentMethodDTO,
    PaymentMethodResponse,
    PaymentMethodError,
} from "@/types/payment";
import { PaymentMethodType } from '@/lib/generated/prisma';
import { prisma } from "@/lib/prisma";

export class PaymentService {
    static async createPayment(userId: string, data: CreatePaymentMethodDTO): Promise<PaymentMethodResponse> {
        try {
            // validate payment method data
            this.validatePaymentMethodData(data);

            // check for duplicate payment method
            const existingMethod = await this.findDuplicatePaymentMethod(userId, data);
            if (existingMethod) {
                throw new PaymentMethodError(
                    'Payment method already exists',
                    'DUPLICATE',
                    409
                );
            }

            // If setting as default or if it's the first payment method
            const existingCount = await prisma.paymentMethod.count({
                where: { userId, isActive: true },
            });

            const isDefault = data.isDefault || existingCount === 0;
            // If setting as default, unset other defaults
            if (isDefault) {
                await prisma.paymentMethod.updateMany({
                    where: { userId, isDefault: true },
                    data: { isDefault: false },
                });
            }

            const paymentMethod = await prisma.paymentMethod.create({
                data: {
                    userId,
                    ...data,
                    isDefault,
                    isActive: true,
                },
            });

            return this.formatPaymentMethodResponse(paymentMethod);
        } catch (error: any) {
            if (error instanceof PaymentMethodError) throw error;
            throw new PaymentMethodError(
                error.message || 'Failed to create payment method',
                'CREATE_FAILED',
                500
            );
        }
    }

    static async updatePayment(
        id: string,
        userId: string,
        data: UpdatePaymentMethodDTO
    ): Promise<PaymentMethodResponse> {
        try {
            // Check if payment method exists
            const existing = await prisma.paymentMethod.findFirst({
                where: { id, userId, isActive: true },
            });

            if (!existing) {
                throw new PaymentMethodError(
                    'Payment method not found',
                    'NOT_FOUND',
                    404
                );
            }

            // If setting as default, unset other defaults
            if (data.isDefault) {
                await prisma.paymentMethod.updateMany({
                    where: { userId, isDefault: true, id: { not: id } },
                    data: { isDefault: false },
                });
            }

            const paymentMethod = await prisma.paymentMethod.update({
                where: { id },
                data,
            });

            return this.formatPaymentMethodResponse(paymentMethod);
        } catch (error: any) {
            if (error instanceof PaymentMethodError) throw error;
            throw new PaymentMethodError(
                error.message || 'Failed to update payment method',
                'UPDATE_FAILED',
                500
            );
        }
    }

    static async getPaymentByOrderId(orderId: string) {
        try {
            return await prisma.payment.findFirst({
                where: { razorpayOrderId: orderId },
            });
        } catch (error: any) {
            throw new PaymentMethodError(error.message || 'Failed to get payment', 'FETCH_FAILED', 500);
        }
    }

    static async getPaymentByPaymentId(paymentId: string) {
        try {
            return await prisma.payment.findUnique({
                where: { razorpayPaymentId: paymentId },
            });
        } catch (error: any) {
            throw new PaymentMethodError(error.message || 'Failed to get payment by payment ID', 'FETCH_FAILED', 500);
        }
    }

    /**
   * Get all payment methods for a user
   */
    static async getUserPaymentMethods(userId: string): Promise<PaymentMethodResponse[]> {
        try {
            const paymentMethods = await prisma.paymentMethod.findMany({
                where: {
                    userId,
                    isActive: true,
                },
                orderBy: [
                    { isDefault: 'desc' },
                    { createdAt: 'desc' },
                ],
            });
            return paymentMethods.map(this.formatPaymentMethodResponse);
        } catch (error: any) {
            throw new PaymentMethodError(
                error.message || 'Failed to fetch payment methods',
                'FETCH_FAILED',
                500
            );
        }
    }

    /**
   * Get a specific payment method
   */
    static async getPaymentMethod(id: string, userId: string): Promise<PaymentMethodResponse> {
        try {
            const paymentMethod = await prisma.paymentMethod.findFirst({
                where: {
                    id,
                    userId,
                    isActive: true,
                },
            });

            if (!paymentMethod) {
                throw new PaymentMethodError(
                    'Payment method not found',
                    'NOT_FOUND',
                    404
                );
            }

            return this.formatPaymentMethodResponse(paymentMethod);
        } catch (error: any) {
            if (error instanceof PaymentMethodError) throw error;
            throw new PaymentMethodError(
                error.message || 'Failed to fetch payment method',
                'FETCH_FAILED',
                500
            );
        }
    }

    /**
   * Get default payment method
   */
    static async getDefaultPaymentMethod(userId: string): Promise<PaymentMethodResponse | null> {
        try {
            const paymentMethod = await prisma.paymentMethod.findFirst({
                where: {
                    userId,
                    isDefault: true,
                    isActive: true,
                },
            });

            return paymentMethod ? this.formatPaymentMethodResponse(paymentMethod) : null;
        } catch (error: any) {
            throw new PaymentMethodError(
                error.message || 'Failed to fetch default payment method',
                'FETCH_FAILED',
                500
            );
        }
    }

    /**
   * Set payment method as default
   */
    static async setDefaultPaymentMethod(
        id: string,
        userId: string
    ): Promise<PaymentMethodResponse> {
        return this.updatePayment(id, userId, { isDefault: true });
    }

    /**
     * Delete payment method (soft delete)
     */
    static async deletePaymentMethod(id: string, userId: string): Promise<void> {
        try {
            const existing = await prisma.paymentMethod.findFirst({
                where: { id, userId, isActive: true },
            });

            if (!existing) {
                throw new PaymentMethodError(
                    'Payment method not found',
                    'NOT_FOUND',
                    404
                );
            }

            // If deleting default, set another as default
            if (existing.isDefault) {
                const another = await prisma.paymentMethod.findFirst({
                    where: {
                        userId,
                        isActive: true,
                        id: { not: id },
                    },
                    orderBy: { createdAt: 'desc' },
                });

                if (another) {
                    await prisma.paymentMethod.update({
                        where: { id: another.id },
                        data: { isDefault: true },
                    });
                }
            }

            await prisma.paymentMethod.update({
                where: { id },
                data: { isActive: false },
            });
        } catch (error: any) {
            if (error instanceof PaymentMethodError) throw error;
            throw new PaymentMethodError(
                error.message || 'Failed to delete payment method',
                'DELETE_FAILED',
                500
            );
        }
    }

    /**
   * Validate payment method data
   */
    private static validatePaymentMethodData(data: CreatePaymentMethodDTO): void {
        switch (data.type) {
            case PaymentMethodType.CARD:
                if (!data.cardLast4 || !data.cardNetwork) {
                    throw new PaymentMethodError(
                        'Card number and network are required',
                        'VALIDATION_FAILED',
                        400
                    );
                }
                break;

            case PaymentMethodType.UPI:
                if (!data.upiVpa) {
                    throw new PaymentMethodError(
                        'UPI VPA is required',
                        'VALIDATION_FAILED',
                        400
                    );
                }
                // Validate UPI format
                const upiRegex = /^[\w.-]+@[\w.-]+$/;
                if (!upiRegex.test(data.upiVpa)) {
                    throw new PaymentMethodError(
                        'Invalid UPI ID format',
                        'VALIDATION_FAILED',
                        400
                    );
                }
                break;

            case PaymentMethodType.NETBANKING:
                if (!data.bankName) {
                    throw new PaymentMethodError(
                        'Bank name is required',
                        'VALIDATION_FAILED',
                        400
                    );
                }
                break;

            case PaymentMethodType.WALLET:
                if (!data.walletName) {
                    throw new PaymentMethodError(
                        'Wallet name is required',
                        'VALIDATION_FAILED',
                        400
                    );
                }
                break;
        }
    }

    /**
     * Find duplicate payment method
     */
    private static async findDuplicatePaymentMethod(
        userId: string,
        data: CreatePaymentMethodDTO
    ) {
        const where: any = { userId, isActive: true, type: data.type };

        switch (data.type) {
            case PaymentMethodType.CARD:
                if (data.cardFingerPrint) {
                    where.cardFingerPrint = data.cardFingerPrint;
                } else if (data.cardLast4) {
                    where.cardLast4 = data.cardLast4;
                    where.cardNetwork = data.cardNetwork;
                }
                break;

            case PaymentMethodType.UPI:
                where.upiVpa = data.upiVpa;
                break;

            case PaymentMethodType.NETBANKING:
                where.bankName = data.bankName;
                break;

            case PaymentMethodType.WALLET:
                where.walletName = data.walletName;
                break;
        }

        return await prisma.paymentMethod.findFirst({ where });
    }

    /**
     * Format payment method for response
     */
    private static formatPaymentMethodResponse(paymentMethod: any): PaymentMethodResponse {
        let displayInfo = '';

        switch (paymentMethod.type) {
            case PaymentMethodType.CARD:
                displayInfo = `${paymentMethod.cardNetwork} •••• ${paymentMethod.cardLast4}`;
                break;
            case PaymentMethodType.UPI:
                displayInfo = paymentMethod.upiVpa;
                break;
            case PaymentMethodType.NETBANKING:
                displayInfo = paymentMethod.bankName;
                break;
            case PaymentMethodType.WALLET:
                displayInfo = paymentMethod.walletName;
                break;
        }

        return {
            id: paymentMethod.id,
            userId: paymentMethod.userId,
            type: paymentMethod.type,
            displayInfo,
            cardType: paymentMethod.cardType,
            cardNetwork: paymentMethod.cardNetwork,
            cardLast4: paymentMethod.cardLast4,
            cardExpMonth: paymentMethod.cardExpMonth,
            cardExpYear: paymentMethod.cardExpYear,
            upiVpa: paymentMethod.upiVpa,
            bankName: paymentMethod.bankName,
            walletName: paymentMethod.walletName,
            isDefault: paymentMethod.isDefault,
            isActive: paymentMethod.isActive,
            nickname: paymentMethod.nickname,
            createdAt: paymentMethod.createdAt,
            updatedAt: paymentMethod.updatedAt,
        };
    }
}