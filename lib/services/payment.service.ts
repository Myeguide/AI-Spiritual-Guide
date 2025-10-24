import { DatabaseError } from "@/types/payment";
import { PaymentStatus } from "../generated/prisma";
import { prisma } from "../prisma";

export class PaymentService {
    static async createPayment(data: {
        userId: string;
        subscriptionId?: string;
        razorpayOrderId: string;
        amount: string;
        currency: string;
        description?: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        notes?: Record<string, any>;
    }) {
        try {
            return await prisma.payment.create({
                data: {
                    userId: data.userId,
                    subscriptionId: data.subscriptionId || "",
                    razorpayOrderId: data.razorpayOrderId,
                    amount: data.amount,
                    currency: data.currency,
                    status: PaymentStatus.CREATED,
                    description: data.description || null,
                    notes: data.notes ?? undefined,
                },
            });
        } catch (error) {
            throw new DatabaseError('Failed to create payment', error);
        }
    }

    static async updatePayment(
        orderId: string,
        data: {
            razorpayPaymentId?: string;
            razorpaySignature?: string;
            status: PaymentStatus;
            method?: string;
        }
    ) {
        try {
            return await prisma.payment.updateMany({
                where: { razorpayOrderId: orderId },
                data,
            });
        } catch (error) {
            throw new DatabaseError('Failed to update payment', error);
        }
    }

    static async getPaymentByOrderId(orderId: string) {
        try {
            return await prisma.payment.findFirst({
                where: { razorpayOrderId: orderId },
            });
        } catch (error) {
            throw new DatabaseError('Failed to get payment', error);
        }
    }

    static async getPaymentByPaymentId(paymentId: string) {
        try {
            return await prisma.payment.findUnique({
                where: { razorpayPaymentId: paymentId },
            });
        } catch (error) {
            throw new DatabaseError('Failed to get payment by payment ID', error);
        }
    }

    static async getUserPayments(userId: string) {
        try {
            return await prisma.payment.findMany({
                where: { userId },
                orderBy: {
                    createdAt: 'desc',
                },
                include: {
                    subscription: {
                        select: {
                            planType: true,
                        },
                    },
                },
            });
        } catch (error) {
            throw new DatabaseError('Failed to get user payments', error);
        }
    }
}