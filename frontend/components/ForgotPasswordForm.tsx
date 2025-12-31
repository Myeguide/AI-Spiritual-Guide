import { useState, useEffect } from "react";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { PhoneInput } from "react-international-phone";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/frontend/components/ui/input-otp";
import { apiCall } from "@/utils/api-call";
import { toast } from "sonner";
import { LoaderCircle, Eye, EyeOff } from "lucide-react";

interface ForgotPasswordFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type Step = "phone" | "otp" | "password";

export default function ForgotPasswordForm({
  onSuccess,
  onCancel,
}: ForgotPasswordFormProps) {
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Form state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const isPasswordValid = (password: string) => {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    return regex.test(password);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Step 1: Send OTP to phone number
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiCall("/api/auth/forgot-password", "POST", {
        phoneNumber,
      });

      if (response.success) {
        toast.success("OTP sent to your phone number");
        setStep("otp");
        setCountdown(30);
      } else {
        toast.error(response.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Send OTP error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and proceed to password step
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    // Move to password step (OTP will be verified with password reset)
    setStep("password");
  };

  // Step 3: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid(newPassword)) {
      toast.error(
        "Password must be at least 8 characters, include 1 uppercase letter, 1 number, and 1 special character."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await apiCall("/api/auth/reset-password", "POST", {
        phoneNumber,
        code: otp,
        newPassword,
      });

      if (response.success) {
        onSuccess();
      } else {
        toast.error(response.message || "Failed to reset password");
        // If OTP is invalid, go back to OTP step
        if (response.code === "INVALID_OTP") {
          setStep("otp");
          setOtp("");
        }
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setResendLoading(true);

    try {
      const response = await apiCall("/api/auth/forgot-password", "POST", {
        phoneNumber,
      });

      if (response.success) {
        toast.success("OTP has been resent successfully");
        setCountdown(30);
        setOtp("");
      } else {
        toast.error(response.message || "Failed to resend OTP");
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      toast.error("Something went wrong resending the OTP");
    } finally {
      setResendLoading(false);
    }
  };

  // Step 1: Phone number input
  if (step === "phone") {
    return (
      <form onSubmit={handleSendOTP} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="forgot-phone">Registered Phone Number</Label>
          <PhoneInput
            defaultCountry="in"
            value={phoneNumber}
            inputClassName="w-full"
            onChange={(phone) => setPhoneNumber(phone)}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Button
            type="submit"
            className="w-full bg-[#B500FF]"
            disabled={loading || !phoneNumber}
          >
            {loading ? <LoaderCircle className="animate-spin" /> : "Send OTP"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onCancel}
          >
            Back to Login
          </Button>
        </div>
      </form>
    );
  }

  // Step 2: OTP verification
  if (step === "otp") {
    return (
      <form onSubmit={handleVerifyOTP} className="space-y-6">
        <div className="space-y-2">
          <Label>Enter OTP sent to {phoneNumber}</Label>
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            type="submit"
            className="w-full bg-[#B500FF]"
            disabled={otp.length !== 6}
          >
            Verify OTP
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleResendOTP}
            disabled={resendLoading || countdown > 0}
          >
            {resendLoading ? (
              <LoaderCircle className="animate-spin" />
            ) : countdown > 0 ? (
              `Resend OTP in ${formatTime(countdown)}`
            ) : (
              "Resend OTP"
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setStep("phone");
              setOtp("");
            }}
          >
            Change Phone Number
          </Button>
        </div>
      </form>
    );
  }

  // Step 3: New password input
  return (
    <form onSubmit={handleResetPassword} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showPassword ? "text" : "password"}
            className="w-full border rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-2 flex items-center hover:bg-transparent"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </Button>
        </div>
        {!isPasswordValid(newPassword) && newPassword.length > 0 && (
          <p className="text-sm text-red-500">
            Password must be at least 8 characters, include 1 uppercase letter,
            1 number, and 1 special character.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-new-password">Confirm New Password</Label>
        <div className="relative">
          <Input
            id="confirm-new-password"
            type={showConfirmPassword ? "text" : "password"}
            className="w-full border rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-2 flex items-center hover:bg-transparent"
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </Button>
        </div>
        {confirmPassword && confirmPassword !== newPassword && (
          <p className="text-sm text-red-500">Passwords do not match.</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          className="w-full bg-[#B500FF]"
          disabled={
            loading ||
            !isPasswordValid(newPassword) ||
            newPassword !== confirmPassword
          }
        >
          {loading ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            "Reset Password"
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setStep("otp");
          }}
        >
          Back to OTP
        </Button>
      </div>
    </form>
  );
}

