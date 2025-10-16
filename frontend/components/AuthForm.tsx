import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/frontend/components/ui/tabs";
import { CardContent } from "@/frontend/components/ui/card";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { useUserStore } from "@/frontend/stores/UserStore";

export default function AuthForm() {
  const { setUser, setToken, setLoading } = useUserStore();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [registerName, setRegisterName] = useState({
    firstName: "",
    lastName: "",
  });
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Replace with your actual API call
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setToken(data.token);
      } else {
        alert(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      // TODO: Replace with your actual API call
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: registerName.firstName,
          lastname: registerName.lastName,
          email: registerEmail,
          phone: registerPhone,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setToken(data.token);
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("An error occurred during registration");
    } finally {
      setLoading(false);
    }
  };

  return (
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
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-phone">Registered Phone Number</Label>
              <Input
                id="login-phone"
                type="text"
                placeholder="+1234567890"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="register">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-firstname">FirstName</Label>
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
              <Label htmlFor="register-lastname">LastName</Label>
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
              <Label htmlFor="register-phone">Phone</Label>
              <Input
                id="register-phone"
                type="text"
                placeholder="+1234567890"
                value={registerPhone}
                onChange={(e) => setRegisterPhone(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Create Account
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </CardContent>
  );
}
