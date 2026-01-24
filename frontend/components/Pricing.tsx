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
import { CreditCard, Gift, Loader2 } from "lucide-react";
import MobileNavTrigger from "./MobileNavTrigger";
import MobileNavigator from "./MobileNavigator";


declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PricingPage() {
  const [isNavOpen, setIsNavOpen] = useState(false);
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
      className="min-h-screen py-4 px-4 bg-linear-to-br from-[#B500FF10] via-background to-[#B500FF10]"
    >
      <MobileNavTrigger onClick={() => setIsNavOpen(true)} isOpen={isNavOpen} />
      <MobileNavigator isVisible={isNavOpen} onClose={() => setIsNavOpen(false)} />

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
            <span className="text-muted-foreground text-sm font-medium">Pricing</span>
          </div>
          <h1 className="text-4xl md:text-4xl font-semibold text-foreground mb-4">
            Flexible pricing plans for every need
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            International Cards may incur currency conversion charges by your bank
          </p>
        </div>

        {plansLoading ? (
          <ShimmerPricingScreen />
        ) : (
          <div className="grid gap-6 max-w-4xl mx-auto md:grid-cols-2 lg:grid-cols-2">
            {plans?.filter((p) => p.type !== PlanType.FREE).map((plan) => (
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

        {/* Gift Cards Section */}
        <div className="mt-20 mb-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              True gifts don't fade — they transform lives
            </h2>
            <p className="text-foreground max-w-3xl mx-auto">
              Gift clarity, strength and purpose to the ones you love most. Your purchase goes a long way in spreading Vedic wisdom. We deeply appreciate your support.
            </p>
          </div>

          <div className="grid gap-6 max-w-4xl mx-auto md:grid-cols-2">
            {/* 3 Months Gift Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E879F9] to-[#F0ABFC] p-8 shadow-lg">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#D946EF]/30 rounded-full blur-3xl" />
              <div className="relative">
                <Gift className="w-16 h-16 text-[#86198F] mb-4" strokeWidth={1.5} />
                <h3 className="text-2xl font-bold text-[#1a1a1a] mb-2">3 Months</h3>
                <p className="text-4xl font-bold text-[#1a1a1a] mb-4">₹999</p>
                <p className="text-[#1a1a1a]/80 mb-6">
                  Gift a starter subscription to the ones you love to help them find clarity.
                </p>
                <Button
                  variant="outline"
                  className="bg-white hover:bg-white/90 text-[#B500FF] border-0 font-semibold px-8"
                  onClick={() => toast.info("Gift card feature coming soon!")}
                >
                  Buy Gift
                </Button>
              </div>
            </div>

            {/* 1 Year Gift Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E879F9] to-[#F0ABFC] p-8 shadow-lg">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#D946EF]/30 rounded-full blur-3xl" />
              <div className="relative">
                <Gift className="w-16 h-16 text-[#86198F] mb-4" strokeWidth={1.5} />
                <h3 className="text-2xl font-bold text-[#1a1a1a] mb-2">1 Year</h3>
                <p className="text-4xl font-bold text-[#1a1a1a] mb-4">₹3,599</p>
                <p className="text-[#1a1a1a]/80 mb-6">
                  For the ones who matter most, gift guidance that never fades.
                </p>
                <Button
                  variant="outline"
                  className="bg-white hover:bg-white/90 text-[#B500FF] border-0 font-semibold px-8"
                  onClick={() => toast.info("Gift card feature coming soon!")}
                >
                  Buy Gift
                </Button>
              </div>
            </div>
          </div>
        </div>
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
                            ? "border-[#B500FF] bg-[#B500FF]/10"
                            : "border-border hover:border-[#B500FF]/50"
                        }`}
                      >
                        <CreditCard
                          className={`w-5 h-5 ${
                            selectedPaymentMethodId === method.id
                              ? "text-[#B500FF]"
                              : "text-muted-foreground"
                          }`}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {method.displayInfo}
                          </p>
                          {method.nickname && (
                            <p className="text-xs text-muted-foreground">
                              {method.nickname}
                            </p>
                          )}
                        </div>
                        {method.isDefault && (
                          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
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
                <p className="text-muted-foreground mb-4">No saved payment methods</p>
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
