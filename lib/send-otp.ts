import { prisma } from "./prisma";
import { twilioClient } from "./twilio";

// Send OTP via SMS
export async function sendOTP(
  phoneNumber: string,
  lastName: string,
  firstName: string,
  email: string,
  age: number
): Promise<{
  success: boolean;
  message: string;
  code?: string;
}> {
  try {
    // Generate OTP
    const code = generateOTP();

    // Check if user exists
    const user = await prisma.user.findUnique({
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
      try {
        await prisma.user.create({
          data: {
            phoneNumber,
            firstName, // Provide default values if necessary
            lastName,
            age: age, // Or null if allowed
            email: email,
            otpCode: code,
          },
        });
      } catch (error) {
        console.log("error due to user create", error);
      }
    }
    console.log("user", user);

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
