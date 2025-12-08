import { useState, useEffect } from "react";
import { PricingCard } from "./PricingCard";
import { RazorpayOptions } from "@/types/plan";
import { useUserStore } from "../stores/UserStore";
import { useSubscriptionStore } from "../stores/SubscriptionStore";
import { useNavigate } from "react-router";
import { apiCall } from "@/utils/api-call";
import ShimmerPricingScreen from "./Shimmer";
import { toast } from "sonner";
import { PlanType } from "@/types/payment";
import { usePlans } from "@/frontend/hooks/usePlans";
import { usePaymentMethods } from "@/frontend/hooks/usePaymentMethod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/frontend/components/ui/dialog";
import { Button } from "@/frontend/components/ui/button";
import { Checkbox } from "@/frontend/components/ui/checkbox";
import { Label } from "@/frontend/components/ui/label";
import { CreditCard, Loader2 } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PricingPage() {
  const { user, fetchSubscription } = useUserStore();
  const { plans, isLoading: plansLoading } = usePlans();
  const {
    paymentMethods,
    loading: paymentMethodsLoading,
    refetch: refetchPaymentMethods,
  } = usePaymentMethods();
  const {
    subscription,
    currentPlan,
    showExpiredMessage,
    setSubscription,
    setCurrentPlan,
  } = useSubscriptionStore();
  const [loading, setLoading] = useState<string>("");
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  const [savePaymentMethod, setSavePaymentMethod] = useState(true);
  const [selectedPlanType, setSelectedPlanType] = useState<string>("");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
    useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadRazorpayScript = () => {
      return new Promise((resolve) => {
        if (window.Razorpay) {
          setRazorpayLoaded(true);
          resolve(true);
          return;
        }
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => {
          setRazorpayLoaded(true);
          resolve(true);
        };
        script.onerror = () => {
          console.error("Failed to load Razorpay script");
          resolve(false);
        };
        document.body.appendChild(script);
      });
    };
    loadRazorpayScript();
  }, []);

  // Fetch user subscription status
  useEffect(() => {
    fetchUserAndSubscription();
  }, [user?.id]);

  // Set default payment method when payment methods are loaded
  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedPaymentMethodId) {
      const defaultMethod = paymentMethods.find((pm) => pm.isDefault);
      if (defaultMethod) {
        setSelectedPaymentMethodId(defaultMethod.id);
      }
    }
  }, [paymentMethods]);

  const fetchUserAndSubscription = async () => {
    if (!user?.id) {
      console.error("No user found");
      setCurrentPlan("");
      return;
    }

    try {
      const res = await apiCall(
        `/api/subscription/status?userId=${user.id}`,
        "GET"
      );
      const { success, data } = res;

      if (success && data) {
        setSubscription(data);
      } else {
        setCurrentPlan("");
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
      setCurrentPlan("");
    }
  };

  const handleSubscribe = async (planType: string) => {
    // Free plan - just redirect to chat
    if (planType === PlanType.FREE) {
      navigate("/chat");
      return;
    }

    // Check if Razorpay is loaded
    if (!razorpayLoaded) {
      toast.error("Payment gateway is loading. Please try again in a moment.");
      return;
    }

    // Store selected plan type
    setSelectedPlanType(planType);

    // Show payment method selection dialog if user has saved payment methods
    // if (paymentMethods.length > 0) {
    //   setShowPaymentMethodDialog(true);
    // } else {
    //   // Proceed directly to payment
    //   await proceedToPayment(planType);
    // }
    await proceedToPayment(planType);
  };

  const proceedToPayment = async (planType: string) => {
    setLoading(planType);
    // setShowPaymentMethodDialog(false);

    try {
      // Create order
      const orderResponse = await apiCall("/api/payments/create", "POST", {
        subscriptionId: subscription?.subscription?.id || null,
        tierId: plans?.find((p) => p.type === planType)?.id,
        paymentMethodId: selectedPaymentMethodId || null,
      });

      if (!orderResponse.success) {
        throw new Error(orderResponse.error || "Failed to create order");
      }

      const options: RazorpayOptions = {
        key: orderResponse.data.keyId,
        amount: orderResponse.data.amount,
        currency: orderResponse.data.currency,
        name: "My Eternal Guide",
        description: `${
          plans?.find((p) => p.type === planType)?.name
        } Subscription`,
        image:
          "https://myeternalguide.com/wp-content/uploads/2025/10/MEG-Logo-New-Tagline_286x54.png",
        order_id: orderResponse.data.orderId,
        tokenId: orderResponse.data.tokenId,
        ...(orderResponse.data.customerId && {
          customer_id: orderResponse.data.customerId,
        }),
        ...(orderResponse.data.tokenId && {
          recurring: "1", // Required for token-based payments
          token: orderResponse.data.tokenId,
        }),
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          try {
            const verifyResponse = await apiCall(
              "/api/payments/verify",
              "POST",
              {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                subscriptionId: orderResponse.data.subscriptionId,
                savePaymentMethod: savePaymentMethod,
                paymentMethodNickname: undefined, // Can be added to dialog
              }
            );

            if (!verifyResponse.success) {
              throw new Error(
                verifyResponse.error || "Payment verification failed"
              );
            }

            // Update current plan immediately
            setCurrentPlan(planType);
            await fetchUserAndSubscription();

            // Refetch payment methods if we saved a new one
            if (savePaymentMethod) {
              await refetchPaymentMethods();
            }

            toast.success(
              `🎉 Payment Successful!\n\nYou are now subscribed to the ${
                plans?.find((p) => p.type === planType)?.name
              }`
            );
            await fetchSubscription();

            // Redirect to dashboard
            setTimeout(() => {
              navigate("/chat");
            }, 2000);
          } catch (error) {
            console.error("Payment verification error:", error);
            toast.error(
              `Payment Verification Failed\n\n${
                error instanceof Error
                  ? error.message
                  : "Please contact support with your payment ID"
              }`
            );
          } finally {
            setLoading("");
          }
        },
        prefill: {
          firstName: user?.firstName || "",
          lastName: user?.lastName || "",
          email: user?.email || "",
          contact: user?.phoneNumber || "",
        },
        theme: {
          color: "#bb00ff",
        },
        modal: {
          ondismiss: function (): void {
            setLoading("");
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Subscribe error:", error);
      toast.error(
        `Subscription Failed\n\n - \n\n${
          error instanceof Error ? error.message : "Please try again later"
        }`
      );
      setLoading("");
    }
  };

  const PRIMARY_COLOR = "#B500FF";

  return (
    <div
      className="min-h-screen py-4 px-4"
      style={{
        background: `linear-gradient(to bottom right, ${PRIMARY_COLOR}10, white, ${PRIMARY_COLOR}10)`,
      }}
    >
      <div className="mx-auto">
        {!subscription?.hasActiveSubscription && showExpiredMessage && (
          <div className="absolute w-full left-0 top-0 bg-red-100 dark:bg-red-900 dark:text-white text-red-800 px-4 py-2 text-sm font-medium">
            <span className="flex items-center justify-center">
              Your subscription has expired, or your request limit has been
              reached. Please renew or upgrade your plan to continue.
            </span>
          </div>
        )}

        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span style={{ color: PRIMARY_COLOR }}>✦</span>
            <span className="text-gray-600 text-sm font-medium">Pricing</span>
          </div>
          <h1 className="text-4xl md:text-4xl font-semibold text-gray-900 mb-4">
            Flexible pricing plans for every need
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto mb-8">
            Find the perfect plan—whether you're starting out or scaling up with
            advanced tools and premium support.
          </p>
        </div>

        {plansLoading ? (
          <ShimmerPricingScreen />
        ) : (
          <div className="grid gap-6 max-w-6xl mx-auto md:grid-cols-2 lg:grid-cols-3">
            {plans?.map((plan) => (
              <PricingCard
                key={plan.type}
                plan={plan}
                currentPlan={currentPlan}
                loading={loading}
                handleSubscribe={handleSubscribe}
              />
            ))}
          </div>
        )}
      </div>

      {/* Payment Method Selection Dialog */}
      <Dialog
        open={showPaymentMethodDialog}
        onOpenChange={setShowPaymentMethodDialog}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
            <DialogDescription>
              Select a saved payment method or add a new one
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {paymentMethodsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : paymentMethods.length > 0 ? (
              <>
                {/* Saved Payment Methods */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Saved Payment Methods
                  </Label>
                  <div className="space-y-2">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        onClick={() => setSelectedPaymentMethodId(method.id)}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedPaymentMethodId === method.id
                            ? "border-purple-600 bg-purple-50"
                            : "border-gray-200 hover:border-purple-300"
                        }`}
                      >
                        <CreditCard
                          className={`w-5 h-5 ${
                            selectedPaymentMethodId === method.id
                              ? "text-purple-600"
                              : "text-gray-400"
                          }`}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {method.displayInfo}
                          </p>
                          {method.nickname && (
                            <p className="text-xs text-gray-500">
                              {method.nickname}
                            </p>
                          )}
                        </div>
                        {method.isDefault && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add New Payment Method Option */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedPaymentMethodId("");
                    proceedToPayment(selectedPlanType);
                  }}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Use Different Payment Method
                </Button>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-4">No saved payment methods</p>
                <Button onClick={() => proceedToPayment(selectedPlanType)}>
                  Add Payment Method
                </Button>
              </div>
            )}

            {/* Save Payment Method Checkbox */}
            <div className="flex items-center space-x-2 pt-4 border-t">
              <Checkbox
                id="savePaymentMethod"
                checked={savePaymentMethod}
                onCheckedChange={(checked) =>
                  setSavePaymentMethod(checked as boolean)
                }
              />
              <Label
                htmlFor="savePaymentMethod"
                className="text-sm font-normal cursor-pointer"
              >
                Save this payment method for future purchases
              </Label>
            </div>

            {/* Action Buttons */}
            {selectedPaymentMethodId && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentMethodDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => proceedToPayment(selectedPlanType)}
                  className="flex-1"
                  style={{ backgroundColor: PRIMARY_COLOR }}
                >
                  Continue to Payment
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
