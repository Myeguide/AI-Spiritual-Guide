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

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PricingPage() {
  const { user, fetchSubscription } = useUserStore();
  const { plans, isLoading: plansLoading } = usePlans(); // Use the custom hook
  const {
    subscriptionStatus,
    currentPlan,
    showExpiredMessage,
    setSubscriptionStatus,
    setCurrentPlan,
  } = useSubscriptionStore();

  const [loading, setLoading] = useState<string>("");
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
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

  const fetchUserAndSubscription = async () => {
    if (!user?.id) {
      console.error("No user found");
      setCurrentPlan("");
      return;
    }

    try {
      const res = await fetch(`/api/subscription/status?userId=${user.id}`);
      const { success, data } = await res.json();

      if (success && data) {
        setSubscriptionStatus(data);
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

    setLoading(planType);

    try {
      // Create order
      const orderResponse = await apiCall("/api/payments/create", "POST", {
        planType,
        userId: user?.id,
      });

      if (!orderResponse.success) {
        throw new Error(orderResponse.error || "Failed to create order");
      }

      const options: RazorpayOptions = {
        key: orderResponse.data.key,
        amount: orderResponse.data.amount,
        currency: orderResponse.data.currency,
        name: "My Eternal Guide",
        description: `${orderResponse.data.planName} Subscription`,
        image:
          "https://myeternalguide.com/wp-content/uploads/2025/10/MEG-Logo-New-Tagline_286x54.png",
        order_id: orderResponse.data.orderId,
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
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user?.id,
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

            toast.success(
              `🎉 Payment Successful!\n\nYou are now subscribed to the ${orderResponse.data.planName}`
            );
            await fetchSubscription();

            // Refresh subscription status

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
        `Subscription Failed\n\n${
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
        {!subscriptionStatus?.hasActiveSubscription && showExpiredMessage && (
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

        <div className="text-center mt-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            All plans include secure payments via Razorpay
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Need help choosing?{" "}
            {/* <a href="/contact" className="text-purple-600 underline">
              Contact us
            </a> */}
          </p>
        </div>
      </div>
    </div>
  );
}
