import { useState } from "react";
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
import { LoaderCircle, MessageSquare } from "lucide-react";
import { PhoneInput } from "react-international-phone";
import InputOTPForm from "@/frontend/components/InputOtp";
import { apiCall } from "@/utils/api-call";
import { toast } from "sonner";

export default function AuthForm() {
  const { setUser, setToken, setLoading, loading } = useUserStore();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Login state
  const [loginPhone, setLoginPhone] = useState("");

  // Register state
  const [registerName, setRegisterName] = useState({
    firstName: "",
    lastName: "",
  });
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerAge, setRegisterAge] = useState("");

  const [registeredUser, setRegisteredUser] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiCall("/api/login", "POST", {
        phoneNumber: loginPhone,
      });

      if (response.success) {
        setUser(response.user);
        setToken(response.token);
        setOtpVerified(true);
        return;
      } else {
        toast.error("No account found with this phone number");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiCall("/api/send-otp", "POST", {
        firstName: registerName.firstName,
        lastName: registerName.lastName,
        email: registerEmail,
        age: parseInt(registerAge),
        phoneNumber: registerPhone,
      });

      if (response.success) {
        setRegisteredUser(response);
      } else {
        alert(response.error || response.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (otpVerified) {
    toast.success("OTP verified successfully");
  }

  if (registeredUser) {
    return (
      <InputOTPForm
        phoneNumber={registerPhone}
        firstName={registerName.firstName}
        lastName={registerName.lastName}
        email={registerEmail}
        onVerified={() => setOtpVerified(true)}
      />
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
              <Button type="submit" className="w-full">
                {loading ? <LoaderCircle className="animate-spin" /> : "Login"}
              </Button>
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
                <Label htmlFor="register-age">Age</Label>
                <Input
                  id="register-age"
                  type="number"
                  placeholder="30"
                  value={registerAge}
                  onChange={(e) => setRegisterAge(e.target.value)}
                  required
                />
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
              <Button type="submit" className="w-full">
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
