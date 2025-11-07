import { prisma } from '@/lib/prisma';
import { generateOTP } from './generate-otp.service';

// Custom error classes for error handling
export class OTPError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 400
    ) {
        super(message);
        this.name = 'OTPError';
    }
}

export class PhoneNumberExistsError extends OTPError {
    constructor(phoneNumber: string) {
        super(
            `Phone number ${phoneNumber} is already registered`,
            'PHONE_NUMBER_EXISTS',
            409
        );
    }
}

export class InvalidOTPError extends OTPError {
    constructor() {
        super('Invalid or expired OTP', 'INVALID_OTP', 401);
    }
}

export class RateLimitError extends OTPError {
    constructor(retryAfter: number) {
        super(
            `Too many OTP requests. Please try again in ${retryAfter} seconds`,
            'RATE_LIMIT_EXCEEDED',
            429
        );
    }
}

interface OTPConfig {
    expiryMinutes?: number;
    maxAttempts?: number;
    rateLimitWindow?: number; // seconds
    maxRequestsPerWindow?: number;
}

const DEFAULT_CONFIG: Required<OTPConfig> = {
    expiryMinutes: 5,
    maxAttempts: 3,
    rateLimitWindow: 60, // 1 minute
    maxRequestsPerWindow: 3,
};

export class OTPService {
    private static config: Required<OTPConfig> = DEFAULT_CONFIG;

    // configure otp service setting
    static configure(config: OTPConfig): void {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // check rate limiting for otp requests
    private static async checkRateLimit(phoneNumber: string): Promise<void> {
        const windowStart = new Date(
            Date.now() - this.config.rateLimitWindow * 1000
        );

        const recentAttempts = await prisma.otpCode.count({
            where: {
                phoneNumber,
                createdAt: { gte: windowStart },
            },
        });

        if (recentAttempts >= this.config.maxRequestsPerWindow) {
            throw new RateLimitError(this.config.rateLimitWindow);
        }
    }

    // check if phone number is already exists 
    private static async checkPhoneNumberExists(
        phoneNumber: string
    ): Promise<boolean> {
        const existingUser = await prisma.user.findUnique({
            where: { phoneNumber },
            select: { id: true },
        });

        return !!existingUser;
    }

    /**
     * Create OTP for phone number
     * @throws {PhoneNumberExistsError} If phone number already registered
     * @throws {RateLimitError} If too many requests
     */
    static async createOTP(phoneNumber: string): Promise<string> {

        // check if phone number exists
        const phoneExists = await this.checkPhoneNumberExists(phoneNumber);
        if (phoneExists) {
            throw new PhoneNumberExistsError(phoneNumber);
        }

        // check rate limiting
        await this.checkRateLimit(phoneNumber);

        const code = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes


        try {
            // Use transaction for atomic operations
            await prisma.$transaction(async (tx) => {
                // Invalidate existing unused OTPs
                await tx.otpCode.updateMany({
                    where: {
                        phoneNumber,
                        isUsed: false,
                        expiresAt: { gte: new Date() },
                    },
                    data: { isUsed: true },
                });

                // Create new OTP
                await tx.otpCode.create({
                    data: {
                        phoneNumber,
                        code,
                        expiresAt,
                    },
                });
            });

            return code;
        } catch (error) {
            console.error('[OTP] Creation failed:', error);
            throw new OTPError(
                'Failed to create OTP',
                'OTP_CREATION_FAILED',
                500
            );
        }
    }

    /**
     * Verify OTP and remove from database upon successful verification
     * @throws {InvalidOTPError} If OTP is invalid or expired
     */
    static async verifyOTP(phoneNumber: string, code: string): Promise<{
        success: boolean;
        message: string;
    }> {
        try {
            // Find valid OTP within a transaction
            await prisma.$transaction(async (tx) => {
                const otpRecord = await tx.otpCode.findFirst({
                    where: {
                        phoneNumber,
                        code,
                        isUsed: false,
                        expiresAt: { gte: new Date() },
                    },
                });

                if (!otpRecord) {
                    // Check if OTP exists but is expired or used
                    const anyOTP = await tx.otpCode.findFirst({
                        where: {
                            phoneNumber,
                            code,
                        },
                        orderBy: { createdAt: 'desc' },
                    });

                    if (anyOTP) {
                        if (anyOTP.isUsed) {
                            throw new OTPError(
                                'OTP has already been used',
                                'OTP_ALREADY_USED',
                                400
                            );
                        }
                        if (anyOTP.expiresAt < new Date()) {
                            throw new OTPError(
                                'OTP has expired',
                                'OTP_EXPIRED',
                                400
                            );
                        }
                    }

                    throw new InvalidOTPError();
                }

                // Delete the OTP record (cleanup after verification)
                await tx.otpCode.delete({
                    where: { id: otpRecord.id },
                });

                return { verified: true, otpId: otpRecord.id };
            });

            return {
                success: true,
                message: 'OTP verified successfully',
            };
        } catch (error) {
            if (error instanceof OTPError) {
                throw error;
            }

            console.error('[OTP] Verification failed:', error);
            throw new InvalidOTPError();
        }
    }
}