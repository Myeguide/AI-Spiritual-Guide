import { prisma } from "@/lib/prisma";

export async function verifyOTP(
  phoneNumber: string,
  code: string
): Promise<{
  success: boolean;
  userId?: string;
  message: string;
}> {
  try {
    // Find the user by phone number
    const user = await prisma.user.findUnique({
      where: {
        phoneNumber,
      },
    });

    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    // Check if the OTP matches
    if (user.otpCode !== code) {
      return {
        success: false,
        message: "Invalid OTP",
      };
    }

    // OTP matches, clear the OTP field in the database
    await prisma.user.update({
      where: { phoneNumber },
      data: { otpCode: "" }, // Clear the OTP after successful verification
    });

    return {
      success: true,
      userId: user.id,
      message: "OTP verified successfully",
    };
  } catch (error) {
    console.error("[OTP] Verification error:", error);
    return {
      success: false,
      message: "Verification failed",
    };
  }
}
