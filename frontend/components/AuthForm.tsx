import { useEffect, useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/frontend/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { useUserStore } from "@/frontend/stores/UserStore";
import { LoaderCircle, MessageSquare, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { PhoneInput } from "react-international-phone";
import InputOTPForm from "@/frontend/components/InputOtp";
import { apiCall } from "@/utils/api-call";
import { toast } from "sonner";
import { syncDataFromServer } from "@/lib/sync-server";
import { clearAllUserData } from "../dexie/queries";
import { getOrCreateAnonymousId } from "@/frontend/utils/anonymous";
import { ChevronDownIcon } from "lucide-react";
import { Calendar } from "@/frontend/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/frontend/components/ui/popover";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default function AuthForm() {
  const { setUser, setToken, setLoading, loading } = useUserStore();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Login state
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [registerName, setRegisterName] = useState({
    firstName: "",
    lastName: "",
  });
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [registeredUser, setRegisteredUser] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);

  const isPasswordValid = (password: string) => {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    return regex.test(password);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiCall("/api/auth/login", "POST", {
        phoneNumber: loginPhone,
        password: loginPassword,
      });

      if (response.success) {
        const previousUserId = useUserStore.getState().currentUserId;
        const newUserId = response.user.id;

        // If switching users, clear old data first
        if (previousUserId && previousUserId !== newUserId) {
          await clearAllUserData();
        }

        setUser(response.user);
        setToken(response.token);
        setLoginSuccess(true);

        // Claim guest chats into this account (if any)
        try {
          await apiCall("/api/anonymous/claim", "POST", {
            anonId: getOrCreateAnonymousId(),
          });
        } catch (e) {
          console.error("Failed to claim guest chats:", e);
        }

        // Sync data immediately after successful login
        try {
          await syncDataFromServer();
        } catch (syncError) {
          console.error("❌ Sync failed after login:", syncError);
          // Don't block login if sync fails
          toast.error("Login successful but data sync failed. Please refresh.");
        }

        return;
      } else {
        //error should be thrown be using  frontend but from backend it should come
        toast.error(response.error || "Something went wrong during login");
      }
    } catch (error) {
      console.error(error);
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptedTerms) {
      toast.error("Please accept the terms and conditions to continue");
      return;
    }

    setLoading(true);

    try {
      const response = await apiCall("/api/send-otp", "POST", {
        phoneNumber: registerPhone,
      });

      if (response.success) {
        setRegisteredUser(response);
      } else {
        toast.error(
          response.error || response.message || "Registration failed"
        );
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Something went wrong during registration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (otpVerified) {
      toast.success("OTP verified successfully");
      // prevent duplicate toasts on re-render
      setOtpVerified(false);
    }
  }, [otpVerified]);

  useEffect(() => {
    if (loginSuccess) {
      toast.success("Login successful");
      setLoginSuccess(false);
    }
  }, [loginSuccess]);

  // When switching between login/register, reset transient flags
  useEffect(() => {
    setRegisteredUser(false);
    setOtpVerified(false);
    setLoginSuccess(false);
  }, [activeTab]);

  if (registeredUser) {
    return (
      <InputOTPForm
        phoneNumber={registerPhone}
        firstName={registerName.firstName}
        lastName={registerName.lastName}
        email={registerEmail}
        dob={date ? (() => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })() : ""}
        password={registerPassword}
        onVerified={() => setOtpVerified(true)}
      />
    );
  }

  // Show forgot password form
  if (showForgotPassword) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowForgotPassword(false)}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>Reset Password</CardTitle>
          </div>
          <CardDescription>
            Enter your registered phone number to receive an OTP and reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm
            onSuccess={() => {
              setShowForgotPassword(false);
              setActiveTab("login");
              toast.success("Password reset successfully! Please login with your new password.");
            }}
            onCancel={() => setShowForgotPassword(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <CardTitle>Welcome to MyEternalGuide</CardTitle>
        </div>
        <CardDescription>
          Login or create a new account to start chatting.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "login" | "register")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="login-phone">Registered Phone Number</Label>
                <PhoneInput
                  defaultCountry="in"
                  value={loginPhone}
                  inputClassName="w-full"
                  onChange={(phone) => setLoginPhone(phone)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="w-full border rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="off"
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
              </div>
              <Button type="submit" className="w-full bg-[#B500FF]">
                {loading ? <LoaderCircle className="animate-spin" /> : "Login"}
              </Button>
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:text-primary/80 underline"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="register-firstname">First Name</Label>
                <Input
                  id="register-firstname"
                  type="text"
                  placeholder="John"
                  value={registerName.firstName}
                  onChange={(e) =>
                    setRegisterName((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-lastname">Last Name</Label>
                <Input
                  id="register-lastname"
                  type="text"
                  placeholder="Doe"
                  value={registerName.lastName}
                  onChange={(e) =>
                    setRegisterName((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="you@example.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date of Birth</Label>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      id="date"
                      className="w-full justify-between font-normal border border-gray-200"
                    >
                      {date ? date.toLocaleDateString() : "Select date"}
                      <ChevronDownIcon />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={date}
                      captionLayout="dropdown"
                      onSelect={(selectedDate) => {
                        setDate(selectedDate);
                        setOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-phone">Phone</Label>
                <PhoneInput
                  defaultCountry="in"
                  placeholder="+1234567890"
                  value={registerPhone}
                  onChange={(phone) => setRegisterPhone(phone)}
                  inputClassName="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <div className="relative">
                  <Input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    className="w-full border rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    autoComplete="off"
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
                {/* Password validation message */}
                {!isPasswordValid(registerPassword) &&
                  registerPassword.length > 0 && (
                    <p className="text-sm text-red-500">
                      Password must be at least 8 characters, include 1
                      uppercase letter, 1 number, and 1 special character.
                    </p>
                  )}
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full border rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="off"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-2 flex items-center hover:bg-transparent"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </Button>
                </div>
                {confirmPassword && confirmPassword !== registerPassword && (
                  <p className="text-sm text-red-500">
                    Passwords do not match.
                  </p>
                )}
              </div>
              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="accept-terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  required
                />
                <Label
                  htmlFor="accept-terms"
                  className="text-sm font-normal leading-relaxed cursor-pointer"
                >
                  I accept the{" "}
                  <a
                    href="https://myeternalguide.com/terms-conditions/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80"
                  >
                    Terms and Conditions
                  </a>
                </Label>
              </div>
              <Button
                type="submit"
                disabled={
                  loading ||
                  !isPasswordValid(registerPassword) ||
                  confirmPassword !== registerPassword ||
                  !acceptedTerms
                }
                className="w-full bg-[#B500FF]"
              >
                {loading ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  "Generate OTP"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
