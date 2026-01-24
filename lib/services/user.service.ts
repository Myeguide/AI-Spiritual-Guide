import { prisma } from '@/lib/prisma';
import { PlanType } from '@/types/payment';

export class UserService {
    static async createUser(data: {
        phoneNumber: string;
        firstName: string;
        lastName: string;
        email: string;
        age?: number;
        password: string;
        dob: Date;
    }) {
        const newUser = await prisma.user.create({
            data: {
                phoneNumber: data.phoneNumber,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                age: data.age ?? null,
                password: data.password,
                dob: data.dob,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                email: true,
                age: true,
                password: true,
                dob: true,
            },
        });

        return newUser;
    }

    static async createUserWithFreeSubscription(data: {
        phoneNumber: string;
        firstName: string;
        lastName: string;
        email: string;
        age?: number;
        password: string;
        dob: Date
    }) {
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 2);

        // Get free tier details
        const freeTier = await prisma.subscriptionTier.findFirst({
            where: { type: PlanType.FREE }
        });

        if (!freeTier) {
            throw new Error("Free tier not found in database");
        }

        // Create user with subscription in a transaction
        const user = await prisma.$transaction(async (tx) => {
            // Create the user
            const newUser = await tx.user.create({
                data: {
                    phoneNumber: data.phoneNumber,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    age: data.age ?? null,
                    password: data.password,
                    dob: data.dob
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                    email: true,
                    age: true,
                    password: true,
                    dob: true
                }
            });

            // Create the free subscription
            const subscription = await tx.subscription.create({
                data: {
                    userId: newUser.id,
                    tierId: freeTier.id,
                    planType: PlanType.FREE,
                    amount: "0",
                    currency: "INR",
                    totalRequests: freeTier.totalRequests,
                    requestsUsed: 0,
                    status: "ACTIVE",
                    startDate: new Date(),
                    expiresAt: expiryDate
                }
            });

            // Update user with active subscription ID
            await tx.user.update({
                where: { id: newUser.id },
                data: { activeSubscriptionId: subscription.id }
            });

            return newUser;
        });

        return user;
    }

    static async getUserByPhoneOrEmail(phoneNumber?: string, email?: string) {
        return await prisma.user.findFirst({
            where: {
                OR: [
                    phoneNumber ? { phoneNumber } : {},
                    email ? { email } : {}
                ].filter(condition => Object.keys(condition).length > 0)
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                email: true,
                age: true,
                dob: true,
                password: true,
            }
        });
    }

    static async getUserById(userId: string) {
        return await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                email: true,
                age: true,
            }
        });
    }
}