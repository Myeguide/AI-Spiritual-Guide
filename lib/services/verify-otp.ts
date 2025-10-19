import { prisma } from "../prisma";

export async function verifyOTP(
  phoneNumber: string,
  code: string
): Promise<{
  success: boolean;
  userId?: string;
  message: string;
}> {
  try {
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        phoneNumber,
        code,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!otpRecord) {
      return {
        success: false,
        message: "Invalid or expired OTP",
      };
    }

    // Delete OTP after successful verification
    await prisma.otpCode.delete({
      where: { id: otpRecord.id },
    });

    return {
      success: true,
      userId: otpRecord.userId,
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