import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/frontend/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/frontend/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/frontend/components/ui/input-otp";
import { useUserStore } from "../stores/UserStore";
import { apiCall } from "@/utils/api-call";
import { LoaderCircle } from "lucide-react";
import { useState, useEffect } from "react";

const FormSchema = z.object({
  pin: z
    .string()
    .min(6, { message: "Your one-time password must be 6 digits." })
    .max(6),
});

export default function InputOTPForm({
  phoneNumber,
  firstName,
  lastName,
  email,
  password,
  onVerified,
  dob,
}: {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  age?: number;
  password?: string;
  dob: string;
  onVerified: () => void;
}) {
  const { setUser, setToken, setLoading, loading } = useUserStore();
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { pin: "" },
  });

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Initialize countdown on mount (5 minutes = 300 seconds)
  useEffect(() => {
    setCountdown(30);
  }, []);

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setLoading(true);
    try {
      const response = await apiCall("/api/auth/register", "POST", {
        phoneNumber,
        code: data.pin,
        firstName,
        lastName,
        email,
        password,
        dob,
      });

      if (response.success) {
        setUser(response.user);
        setToken(response.token);
        onVerified();
        return;
      } else {
        toast.error(response.error || "Invalid OTP");
      }
    } catch (error) {
      console.error("OTP verify error:", error);
      toast.error("Something went wrong verifying the OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOTP() {
    if (countdown > 0) return;

    setResendLoading(true);
    try {
      const response = await apiCall("/api/resend-otp", "POST", {
        phoneNumber,
      });

      if (response.success) {
        toast.success("OTP has been resent successfully");
        setCountdown(30); // Reset to 5 minutes
        form.reset({ pin: "" }); // Clear the input
      } else {
        toast.error(response.error || "Failed to resend OTP");
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      toast.error("Something went wrong resending the OTP");
    } finally {
      setResendLoading(false);
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full max-w-md mx-auto space-y-6"
      >
        <FormField
          control={form.control}
          name="pin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>One-Time Password</FormLabel>
              <FormControl>
                <InputOTP maxLength={6} {...field}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <LoaderCircle className="animate-spin" /> : "Verify OTP"}
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
      </form>
    </Form>
  );
}