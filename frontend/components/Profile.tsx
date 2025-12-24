import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/frontend/components/ui/card";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/frontend/components/ui/avatar";
import {
  Pencil,
  Save,
  X,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
  Shield,
} from "lucide-react";
import { LoggedInUser } from "@/types/user";
import { useUserStore } from "@/frontend/stores/UserStore";
import { usePaymentMethods } from "@/frontend/hooks/usePaymentMethod";
import { PaymentMethodType } from "@/lib/generated/prisma";
import { CreatePaymentMethodDTO } from "@/types/payment";
import { toast } from "sonner";
import { apiCall } from "@/utils/api-call";
import MobileNavTrigger from "./MobileNavTrigger";
import MobileNavigator from "./MobileNavigator";

interface PasswordForm {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NewPaymentForm {
  cardNumber?: string;
  cardIssuer?: string;
  expiryDate?: string;
  cvv?: string;
  upiId?: string;
}

export default function UserProfile() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const { user, updateUser } = useUserStore();
  const {
    paymentMethods,
    loading: paymentMethodsLoading,
    error: paymentMethodsError,
    addPaymentMethod,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    refetch: refetchPaymentMethods,
  } = usePaymentMethods();

  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [profile, setProfile] = useState<LoggedInUser | null>(user);
  const [tempProfile, setTempProfile] = useState<LoggedInUser | null>(user);
  const [isSecurityExpanded, setIsSecurityExpanded] = useState(false);
  const [isPaymentExpanded, setIsPaymentExpanded] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPaymentType, setNewPaymentType] = useState<"card" | "upi">("card");
  const [newPayment, setNewPayment] = useState<NewPaymentForm>({});
  const [addingPaymentLoading, setAddingPaymentLoading] = useState(false);

  const handlePersonalEdit = () => {
    setIsEditingPersonal(true);
    setTempProfile(profile);
  };

  const handleSavePersonal = async () => {
    try {
      // Make API call to update user profile
      const response = await apiCall("/api/user/update-profile", "PATCH", tempProfile);

      if (response.success) {
        setProfile(tempProfile);
        updateUser(tempProfile!);
        setIsEditingPersonal(false);
        toast.success("Profile updated successfully!");
      } else {
        throw new Error(response.error || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    }
  };

  const handleCancel = () => {
    setTempProfile(profile);
    setIsEditingPersonal(false);
  };

  const handleInputChange = (field: keyof LoggedInUser, value: string) => {
    setTempProfile((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handlePasswordChange = (field: keyof PasswordForm, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitPassword = async () => {
    // Validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long!");
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.newPassword)) {
      toast.error(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number!"
      );
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await apiCall("/api/user/change-password", "POST", {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });

      if (response.success) {
        toast.success("Password changed successfully!");
        setPasswordForm({
          oldPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setIsChangingPassword(false);
      } else {
        throw new Error(response.error || "Failed to change password");
      }
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const togglePasswordVisibility = (field: "old" | "new" | "confirm") => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleAddPaymentMethod = async () => {
    // Validation
    if (newPaymentType === "card") {
      if (
        !newPayment.cardNumber ||
        !newPayment.cardIssuer ||
        !newPayment.expiryDate ||
        !newPayment.cvv
      ) {
        toast.error("Please fill all card details!");
        return;
      }

      // Validate card number (basic Luhn algorithm check)
      const cardNumberClean = newPayment.cardNumber.replace(/\s/g, "");
      if (cardNumberClean.length < 13 || cardNumberClean.length > 19) {
        toast.error("Invalid card number!");
        return;
      }

      // Validate expiry date
      const [month, year] = newPayment.expiryDate.split("/");
      const expiry = new Date(parseInt("20" + year), parseInt(month) - 1);
      if (expiry < new Date()) {
        toast.error("Card has expired!");
        return;
      }

      // Validate CVV
      if (newPayment.cvv.length < 3 || newPayment.cvv.length > 4) {
        toast.error("Invalid CVV!");
        return;
      }
    } else {
      if (!newPayment.upiId) {
        toast.error("Please enter UPI ID!");
        return;
      }

      // Validate UPI format
      const upiRegex = /^[\w.-]+@[\w.-]+$/;
      if (!upiRegex.test(newPayment.upiId)) {
        toast.error("Invalid UPI ID format!");
        return;
      }
    }

    setAddingPaymentLoading(true);

    try {
      const paymentMethodData: CreatePaymentMethodDTO = {
        type:
          newPaymentType === "card"
            ? PaymentMethodType.CARD
            : PaymentMethodType.UPI,
      };

      if (newPaymentType === "card") {
        const [expMonth, expYear] = newPayment.expiryDate!.split("/");
        paymentMethodData.cardLast4 = newPayment
          .cardNumber!.replace(/\s/g, "")
          .slice(-4);
        paymentMethodData.cardIssuer = newPayment.cardIssuer;
        paymentMethodData.cardExpMonth = expMonth;
        paymentMethodData.cardExpYear = "20" + expYear;
        // Note: We don't send full card number to backend for security
        // In production, this should go through Razorpay tokenization
        paymentMethodData.cardNetwork = detectCardNetwork(
          newPayment.cardNumber!
        );
        paymentMethodData.cardType = "credit"; // Default, can be enhanced
      } else {
        paymentMethodData.upiVpa = newPayment.upiId;
      }

      await addPaymentMethod(paymentMethodData);

      toast.success("Payment method added successfully!");
      setNewPayment({});
      setIsAddingPayment(false);
    } catch (error: any) {
      console.error("Error adding payment method:", error);
      toast.error(error.message || "Failed to add payment method");
    } finally {
      setAddingPaymentLoading(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment method?")) {
      return;
    }

    try {
      await deletePaymentMethod(id);
      toast.success("Payment method deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting payment method:", error);
      toast.error(error.message || "Failed to delete payment method");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultPaymentMethod(id);
      toast.success("Default payment method updated!");
    } catch (error: any) {
      console.error("Error setting default payment method:", error);
      toast.error(error.message || "Failed to set default payment method");
    }
  };

  const detectCardNetwork = (cardNumber: string): string => {
    const cleaned = cardNumber.replace(/\s/g, "");
    if (/^4/.test(cleaned)) return "Visa";
    if (/^5[1-5]/.test(cleaned)) return "MasterCard";
    if (/^3[47]/.test(cleaned)) return "American Express";
    if (/^6(?:011|5)/.test(cleaned)) return "Discover";
    if (/^(?:2131|1800|35)/.test(cleaned)) return "JCB";
    if (/^(6062|60|81)/.test(cleaned)) return "RuPay";
    return "Unknown";
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts: string[] = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : value;
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case "CARD":
        return <CreditCard className="w-5 h-5 text-[#B500FF]" />;
      case "UPI":
        return (
          <div className="w-5 h-5 bg-purple-600 rounded flex items-center justify-center text-white text-xs font-bold">
            U
          </div>
        );
      default:
        return <CreditCard className="w-5 h-5 text-[#B500FF]" />;
    }
  };

  useEffect(() => {
    if (user) {
      setProfile(user);
      setTempProfile(user);
    }
  }, [user]);

  const PRIMARY_COLOR = "#B500FF";

  return (
    <>
    <MobileNavTrigger onClick={() => setIsNavOpen(true)} isOpen={isNavOpen} />
    <MobileNavigator isVisible={isNavOpen} onClose={() => setIsNavOpen(false)} />
      
      <div className="p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-md font-bold mb-2 pl-8 lg:pl-0">Account Settings</h1>
            <hr />
          </div>

          {/* Profile Card */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="w-10 h-10 border-4">
                <AvatarImage
                  src={tempProfile?.avatar}
                  alt={tempProfile?.firstName || "User"}
                />
                <AvatarFallback
                  style={{ backgroundColor: PRIMARY_COLOR, color: "white" }}
                >
                  {tempProfile?.firstName?.[0]}
                  {tempProfile?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <h3 className="text-2xl font-semibold">
                {profile?.firstName} {profile?.lastName}
              </h3>
            </div>
          </div>

          {/* Personal Information Card */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Personal Information</h2>
                {!isEditingPersonal && (
                  <Button
                    onClick={handlePersonalEdit}
                    variant="secondary"
                    size="sm"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="pb-8">
              {isEditingPersonal ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="editFirstName"
                        className="text-sm font-medium"
                      >
                        First Name
                      </Label>
                      <Input
                        id="editFirstName"
                        value={tempProfile?.firstName || ""}
                        onChange={(e) =>
                          handleInputChange("firstName", e.target.value)
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="editLastName"
                        className="text-sm font-medium"
                      >
                        Last Name
                      </Label>
                      <Input
                        id="editLastName"
                        value={tempProfile?.lastName || ""}
                        onChange={(e) =>
                          handleInputChange("lastName", e.target.value)
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="editEmail"
                        className="text-sm font-medium"
                      >
                        Email Address
                      </Label>
                      <Input
                        id="editEmail"
                        type="email"
                        value={tempProfile?.email || ""}
                        disabled={true}
                        className="mt-1 border-0"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="editPhone"
                        className="text-sm font-medium"
                      >
                        Phone Number
                      </Label>
                      <Input
                        id="editPhone"
                        value={tempProfile?.phoneNumber || ""}
                        disabled={true}
                        className="mt-1 border-0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="editDob" className="text-sm font-medium">
                      Date of Birth
                    </Label>
                    <Input
                      id="editDob"
                      type="date"
                      value={
                        tempProfile?.dob
                          ? new Date(tempProfile.dob)
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      disabled={true}
                      className="mt-1 border-0"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleSavePersonal}
                      className="bg-[#B500FF]"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button onClick={handleCancel} variant="outline">
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">First Name</Label>
                    <p className="font-medium text-lg">{profile?.firstName}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Last Name</Label>
                    <p className="font-medium text-lg">{profile?.lastName}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Email Address</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#B500FF]" />
                      <p className="font-medium">{profile?.email}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Phone Number</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#B500FF]" />
                      <p className="font-medium">{profile?.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Date of Birth</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#B500FF]" />
                      <p className="font-medium">
                        {profile?.dob
                          ? new Date(profile.dob).toLocaleDateString()
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Security Card */}
            <Card>
              <CardContent className="cursor-pointer">
                <div
                  onClick={() => setIsSecurityExpanded(!isSecurityExpanded)}
                  className="w-full flex items-center justify-between hover:bg-transparent"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <h3 className="font-semibold text-xl flex items-center gap-2">
                        <Lock className="w-5 h-5 text-[#B500FF]" />
                        Security
                      </h3>
                      <p className="text-sm">Password & authentication</p>
                    </div>
                  </div>
                  {isSecurityExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>

                {isSecurityExpanded && (
                  <div>
                    <div className="pt-6 space-y-4">
                      {!isChangingPassword ? (
                        <div className="flex items-center justify-between rounded-lg p-4 bg-secondary">
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              <Shield className="w-4 h-4 text-[#B500FF]" />
                              Password
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Keep your account secure
                            </p>
                          </div>
                          <Button
                            onClick={() => setIsChangingPassword(true)}
                            variant="outline"
                            className="border-[#B500FF] text-[#B500FF]"
                          >
                            Change Password
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <Label
                              htmlFor="oldPassword"
                              className="text-sm font-medium"
                            >
                              Current Password
                            </Label>
                            <div className="relative mt-1">
                              <Input
                                id="oldPassword"
                                type={showPasswords.old ? "text" : "password"}
                                value={passwordForm.oldPassword}
                                onChange={(e) =>
                                  handlePasswordChange(
                                    "oldPassword",
                                    e.target.value
                                  )
                                }
                                className="pr-10"
                                placeholder="Enter current password"
                              />
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility("old")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showPasswords.old ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div>
                            <Label
                              htmlFor="newPassword"
                              className="text-sm font-medium"
                            >
                              New Password
                            </Label>
                            <div className="relative mt-1">
                              <Input
                                id="newPassword"
                                type={showPasswords.new ? "text" : "password"}
                                value={passwordForm.newPassword}
                                onChange={(e) =>
                                  handlePasswordChange(
                                    "newPassword",
                                    e.target.value
                                  )
                                }
                                className="pr-10"
                                placeholder="Enter new password"
                              />
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility("new")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showPasswords.new ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Must be at least 8 characters with uppercase,
                              lowercase, and number
                            </p>
                          </div>

                          <div>
                            <Label
                              htmlFor="confirmPassword"
                              className="text-sm font-medium"
                            >
                              Confirm New Password
                            </Label>
                            <div className="relative mt-1">
                              <Input
                                id="confirmPassword"
                                type={
                                  showPasswords.confirm ? "text" : "password"
                                }
                                value={passwordForm.confirmPassword}
                                onChange={(e) =>
                                  handlePasswordChange(
                                    "confirmPassword",
                                    e.target.value
                                  )
                                }
                                className="pr-10"
                                placeholder="Confirm new password"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  togglePasswordVisibility("confirm")
                                }
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showPasswords.confirm ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              onClick={handleSubmitPassword}
                              className="bg-[#B500FF]"
                              disabled={passwordLoading}
                            >
                              {passwordLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-2" />
                                  Update Password
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setIsChangingPassword(false);
                                setPasswordForm({
                                  oldPassword: "",
                                  newPassword: "",
                                  confirmPassword: "",
                                });
                              }}
                              variant="outline"
                              disabled={passwordLoading}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Card */}
            <Card>
              <CardContent className="cursor-pointer">
                <div
                  onClick={() => setIsPaymentExpanded(!isPaymentExpanded)}
                  className="w-full flex items-center justify-between hover:bg-transparent"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <h3 className="font-semibold text-xl flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-[#B500FF]" />
                        Payment Methods
                      </h3>
                      <p className="text-sm">
                        {paymentMethods.length} saved method
                        {paymentMethods.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  {isPaymentExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>

                {isPaymentExpanded && (
                  <div>
                    <div className="pt-6 space-y-4">
                      {/* Loading State */}
                      {paymentMethodsLoading && (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-[#B500FF]" />
                        </div>
                      )}

                      {/* Error State */}
                      {paymentMethodsError && (
                        <div className="p-4 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg text-sm">
                          {paymentMethodsError}
                        </div>
                      )}

                      {/* Saved Payment Methods */}
                      {!paymentMethodsLoading &&
                        !paymentMethodsError &&
                        paymentMethods.map((method) => (
                          <div
                            key={method.id}
                            className="p-4 border-2 border-[#B500FF] rounded-lg transition-colors hover:bg-accent"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {getPaymentMethodIcon(method.type)}
                                  <span className="font-semibold">
                                    {method.displayInfo}
                                  </span>
                                  {method.isDefault && (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                      Default
                                    </span>
                                  )}
                                </div>
                                {method.nickname && (
                                  <p className="text-sm text-muted-foreground">
                                    {method.nickname}
                                  </p>
                                )}
                                {method.cardExpMonth && method.cardExpYear && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Expires: {method.cardExpMonth}/
                                    {method.cardExpYear.slice(-2)}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {!method.isDefault && (
                                  <Button
                                    onClick={() => handleSetDefault(method.id)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-[#B500FF] hover:bg-purple-50"
                                  >
                                    Set Default
                                  </Button>
                                )}
                                <Button
                                  onClick={() => handleDeletePayment(method.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}

                      {/* Empty State */}
                      {!paymentMethodsLoading &&
                        !paymentMethodsError &&
                        paymentMethods.length === 0 && (
                          <div className="text-center py-8">
                            <CreditCard className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                            <p className="text-muted-foreground text-sm">
                              No payment methods saved yet
                            </p>
                          </div>
                        )}

                      {/* Add Payment Method */}
                      {!isAddingPayment ? (
                        <Button
                          onClick={() => setIsAddingPayment(true)}
                          variant="outline"
                          className="w-full border-dashed border-2 border-[#B500FF] text-[#B500FF]"
                          disabled={paymentMethodsLoading}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Payment Method
                        </Button>
                      ) : (
                        <div className="space-y-4 p-4 rounded-lg bg-secondary">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setNewPaymentType("card")}
                              variant={
                                newPaymentType === "card"
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              className={
                                newPaymentType === "card" ? "bg-[#B500FF]" : ""
                              }
                            >
                              Credit/Debit Card
                            </Button>
                            <Button
                              onClick={() => setNewPaymentType("upi")}
                              variant={
                                newPaymentType === "upi" ? "default" : "outline"
                              }
                              size="sm"
                              className={
                                newPaymentType === "upi" ? "bg-[#B500FF]" : ""
                              }
                            >
                              UPI
                            </Button>
                          </div>

                          {newPaymentType === "card" ? (
                            <div className="space-y-3">
                              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <p className="text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                                  <Shield className="w-3 h-3" />
                                  Note: For security, full card details are not
                                  stored. Use Razorpay during checkout for
                                  secure payment processing.
                                </p>
                              </div>
                              <div>
                                <Label
                                  htmlFor="cardNumber"
                                  className="text-sm font-medium"
                                >
                                  Card Number
                                </Label>
                                <Input
                                  id="cardNumber"
                                  placeholder="1234 5678 9012 3456"
                                  maxLength={19}
                                  value={newPayment.cardNumber || ""}
                                  onChange={(e) => {
                                    const formatted = formatCardNumber(
                                      e.target.value
                                    );
                                    setNewPayment({
                                      ...newPayment,
                                      cardNumber: formatted,
                                    });
                                  }}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor="cardHolder"
                                  className="text-sm font-medium"
                                >
                                  Card Holder Name
                                </Label>
                                <Input
                                  id="cardHolder"
                                  placeholder="JOHN DOE"
                                  value={newPayment.cardIssuer || ""}
                                  onChange={(e) =>
                                    setNewPayment({
                                      ...newPayment,
                                      cardIssuer: e.target.value.toUpperCase(),
                                    })
                                  }
                                  className="mt-1"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label
                                    htmlFor="expiryDate"
                                    className="text-sm font-medium"
                                  >
                                    Expiry Date
                                  </Label>
                                  <Input
                                    id="expiryDate"
                                    placeholder="MM/YY"
                                    maxLength={5}
                                    value={newPayment.expiryDate || ""}
                                    onChange={(e) => {
                                      let value = e.target.value.replace(
                                        /\D/g,
                                        ""
                                      );
                                      if (value.length >= 2) {
                                        value =
                                          value.slice(0, 2) +
                                          "/" +
                                          value.slice(2, 4);
                                      }
                                      setNewPayment({
                                        ...newPayment,
                                        expiryDate: value,
                                      });
                                    }}
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label
                                    htmlFor="cvv"
                                    className="text-sm font-medium"
                                  >
                                    CVV
                                  </Label>
                                  <Input
                                    id="cvv"
                                    type="password"
                                    placeholder="123"
                                    maxLength={4}
                                    value={newPayment.cvv || ""}
                                    onChange={(e) =>
                                      setNewPayment({
                                        ...newPayment,
                                        cvv: e.target.value.replace(/\D/g, ""),
                                      })
                                    }
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <Label
                                htmlFor="upiId"
                                className="text-sm font-medium"
                              >
                                UPI ID
                              </Label>
                              <Input
                                id="upiId"
                                placeholder="username@upi"
                                value={newPayment.upiId || ""}
                                onChange={(e) =>
                                  setNewPayment({
                                    ...newPayment,
                                    upiId: e.target.value,
                                  })
                                }
                                className="mt-1"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Enter your UPI ID (e.g., yourname@paytm)
                              </p>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button
                              onClick={handleAddPaymentMethod}
                              className="bg-[#B500FF]"
                              disabled={addingPaymentLoading}
                            >
                              {addingPaymentLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-2" />
                                  Save Payment Method
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setIsAddingPayment(false);
                                setNewPayment({});
                              }}
                              variant="outline"
                              disabled={addingPaymentLoading}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
