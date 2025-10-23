import { prisma } from '@/lib/prisma';
import { generateOTP } from './generate-otp.service';

export class OTPService {
    static async createOTP(phoneNumber: string): Promise<string> {
        const code = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Invalidate any existing OTPs for this phone number
        await prisma.otpCode.updateMany({
            where: { phoneNumber, isUsed: false },
            data: { isUsed: true }
        });

        // Create new OTP
        await prisma.otpCode.create({
            data: {
                phoneNumber,
                code,
                expiresAt,
            }
        });

        return code;
    }

    static async verifyOTP(phoneNumber: string, code: string): Promise<boolean> {
        const otpRecord = await prisma.otpCode.findFirst({
            where: {
                phoneNumber,
                code,
                isUsed: false,
                expiresAt: { gte: new Date() }
            }
        });

        if (!otpRecord) {
            return false;
        }

        // Mark as used
        await prisma.otpCode.update({
            where: { id: otpRecord.id },
            data: { isUsed: true }
        });

        return true;
    }
}