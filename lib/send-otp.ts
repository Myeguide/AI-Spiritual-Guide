import { prisma } from "./prisma";
import { twilioClient } from "./twilio";

// Send OTP via SMS
export async function sendOTP(phoneNumber: string): Promise<{
    success: boolean;
    message: string;
    code?: string;
}> {
    try {
        // Generate OTP
        const code = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Check if user exists
        let user = await prisma.user.findUnique({
            where: { phoneNumber },
        });

        if (user) {
            return {
                success: false,
                message: "User with this phone number already exists",
            };
        }

        // If user doesn't exist, create a temporary record
        if (!user) {
            user = await prisma.user.create({
                data: {
                    phoneNumber,
                    firstName: "",
                    lastName: "",
                    age: null,
                    email: ""
                },
            });
        }

        // Store new OTP
        await prisma.otpCode.create({
            data: {
                userId: user.id,
                phoneNumber,
                code,
                expiresAt,
            },
        });

        // Send SMS
        await twilioClient.messages.create({
            body: `Your EternalGuide verification code is: ${code}\n\nValid for 10 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber,
        });

        return {
            success: true,
            message: "OTP sent successfully",
        };
    } catch (error) {
        console.error("[OTP] Error:", error);
        return {
            success: false,
            message: "Failed to send OTP",
        };
    }
}

// Generate 6-digit OTP
function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}