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
  Camera,
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
} from "lucide-react";
import { LoggedInUser } from "@/types/user";
import { useUserStore } from "@/frontend/stores/UserStore";

interface UserProfile {
  user: LoggedInUser;
}

interface PaymentMethod {
  id: string;
  type: "card" | "upi";
  cardNumber?: string;
  cardHolder?: string;
  expiryDate?: string;
  cvv?: string;
  upiId?: string;
  isDefault: boolean;
}

interface PasswordForm {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function UserProfile() {
  const { user } = useUserStore();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [profile, setProfile] = useState<LoggedInUser | null>(user);
  const [tempProfile, setTempProfile] = useState<LoggedInUser | null>(user);
  const [isSecurityExpanded, setIsSecurityExpanded] = useState(false);
  const [isPaymentExpanded, setIsPaymentExpanded] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
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

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: "1",
      type: "card",
      cardNumber: "4532 **** **** 1234",
      cardHolder: "UMAIMA FAISAL",
      expiryDate: "12/25",
      isDefault: true,
    },
  ]);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPaymentType, setNewPaymentType] = useState<"card" | "upi">("card");
  const [newPayment, setNewPayment] = useState<Partial<PaymentMethod>>({});

  const handlePersonalEdit = () => {
    setIsEditingPersonal(true);
    setTempProfile(profile);
  };

  const handleSavePersonal = () => {
    setProfile(tempProfile);
    setIsEditingPersonal(false);
  };

  const handleCancel = () => {
    setTempProfile(profile);
    setIsEditingProfile(false);
    setIsEditingPersonal(false);
  };

  const handleInputChange = (field: keyof LoggedInUser, value: string) => {
    setTempProfile((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handlePasswordChange = (field: keyof PasswordForm, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitPassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("New passwords do not match!");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      alert("Password must be at least 8 characters long!");
      return;
    }
    // Here you would make an API call to change the password
    alert("Password changed successfully!");
    setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    setIsChangingPassword(false);
  };

  const togglePasswordVisibility = (field: "old" | "new" | "confirm") => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleAddPaymentMethod = () => {
    if (newPaymentType === "card") {
      if (
        !newPayment.cardNumber ||
        !newPayment.cardHolder ||
        !newPayment.expiryDate ||
        !newPayment.cvv
      ) {
        alert("Please fill all card details!");
        return;
      }
    } else {
      if (!newPayment.upiId) {
        alert("Please enter UPI ID!");
        return;
      }
    }

    const payment: PaymentMethod = {
      id: Date.now().toString(),
      type: newPaymentType,
      ...newPayment,
      isDefault: paymentMethods.length === 0,
    } as PaymentMethod;

    setPaymentMethods((prev) => [...prev, payment]);
    setNewPayment({});
    setIsAddingPayment(false);
  };

  const handleDeletePayment = (id: string) => {
    setPaymentMethods((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSetDefault = (id: string) => {
    setPaymentMethods((prev) =>
      prev.map((p) => ({ ...p, isDefault: p.id === id }))
    );
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

  useEffect(() => {
    if (user) {
      setProfile(user);
      setTempProfile(user);
    }
  }, [user]);
  const PRIMARY_COLOR = "#B500FF";
  const ringColors = {
    500: "ring-blue-500",
    600: "ring-blue-600",
    700: "ring-blue-700",
  };

  return (
    <>
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-md font-bold mb-2">Account Settings</h1>
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
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        className="mt-1"
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
                        onChange={(e) =>
                          handleInputChange("phoneNumber", e.target.value)
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="editRole" className="text-sm font-medium">
                      Date of Birth
                    </Label>
                    <Input
                      id="editRole"
                      value={tempProfile?.dob ? String(tempProfile.dob) : ""}
                      onChange={(e) => handleInputChange("dob", e.target.value)}
                      className="mt-1"
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
                    <Label className="text-sm font-medium">Date of Birth</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#B500FF]" />
                      <p className="font-medium">Date of birth</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Phone Number</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#B500FF]" />
                      <p className="font-medium">{profile?.phoneNumber}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Settings Preview */}
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
                      <h3 className="font-semibold text-xl">Security</h3>
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
                        <div className="flex items-center justify-between rounded-lg">
                          <div>
                            <p className="font-medium">Password</p>
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
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPasswords.new ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
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
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Update Password
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
                      <h3 className="font-semibold text-xl">Payment Methods</h3>
                      <p className="text-sm">Manage payment methods</p>
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
                      {/* Saved Payment Methods */}
                      {paymentMethods.map((method) => (
                        <div
                          key={method.id}
                          className="p-4 border-2 border-[#B500FF] rounded-lg transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {method.type === "card" ? (
                                <>
                                  <div className="flex items-center gap-2 mb-2">
                                    <CreditCard className="w-5 h-5 text-[#B500FF]" />
                                    <span className="font-semibold">
                                      {method.cardNumber}
                                    </span>
                                    {method.isDefault && (
                                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm">{method.cardHolder}</p>
                                  <p className="text-xs mt-1">
                                    Expires: {method.expiryDate}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-5 h-5 bg-purple-600 rounded flex items-center justify-center text-xs font-bold">
                                      U
                                    </div>
                                    <span className="font-semibold">UPI</span>
                                    {method.isDefault && (
                                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm">{method.upiId}</p>
                                </>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {!method.isDefault && (
                                <Button
                                  onClick={() => handleSetDefault(method.id)}
                                  variant="ghost"
                                  size="sm"
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

                      {/* Add Payment Method */}
                      {!isAddingPayment ? (
                        <Button
                          onClick={() => setIsAddingPayment(true)}
                          variant="outline"
                          className="w-full border-dashed border-2 border-[#B500FF] text-[#B500FF]"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Payment Method
                        </Button>
                      ) : (
                        <div className="space-y-4 p-4 rounded-lg">
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
                                  value={newPayment.cardHolder || ""}
                                  onChange={(e) =>
                                    setNewPayment({
                                      ...newPayment,
                                      cardHolder: e.target.value.toUpperCase(),
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
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button
                              onClick={handleAddPaymentMethod}
                              className="bg-[#B500FF]"
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Save Payment Method
                            </Button>
                            <Button
                              onClick={() => {
                                setIsAddingPayment(false);
                                setNewPayment({});
                              }}
                              variant="outline"
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
