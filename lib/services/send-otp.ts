import { prisma } from "@/lib/prisma";
import { twilioClient } from "@/lib/twilio";
import { seedPriorityTiers } from "../rate-limiter";

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
    // const result = await seedPriorityTiers();
    // return;
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


    const freeTier = await prisma.priorityTier.findUnique({
      where: { type: 'free' }
    });

    if (!freeTier) {
      throw new Error('Free tier not configured. Please contact support.');
    }

    const now = new Date();
    const nextMonthReset = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    );

    if (!user) {
      try {
        // Create user with subscription in a transaction
        await prisma.$transaction(async (tx) => {
          // Create the user
          const newUser = await tx.user.create({
            data: {
              phoneNumber,
              firstName,
              lastName,
              age: age ?? null,
              email: email,
              otpCode: code,
              tierId: freeTier.id,

              // Initialize token tracking
              tokensUsedLifetime: 0,
              tokensUsedThisMin: 0,
              tokensUsedThisMonth: 0,

              // Set reset dates
              minuteResetAt: now,
              monthResetAt: nextMonthReset,

              // No subscription expiry for free tier
              subscriptionExpiresAt: null,
            },
          });

          // Create the free subscription
          await tx.subscription.create({
            data: {
              userId: newUser.id,
              tokensPerMinute: freeTier.tokensPerMinute,
              tokensPerMonth: freeTier.tokensPerMonth,
              planType: 'free',
              amount: "0",
              currency: 'INR',
              startDate: now,
              endDate: null, // Free tier doesn't expire
              nextBillingDate: null, // No billing for free tier
              status: "ACTIVE"
            },
          });
        });

        console.log("User and free subscription created successfully");
      } catch (error) {
        console.error("Error creating user and subscription:", error);
        throw error;
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
