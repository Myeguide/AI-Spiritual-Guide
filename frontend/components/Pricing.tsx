import { useState, useEffect } from "react";
import { PricingCard } from "./PricingCard";
import { planExtras, RazorpayOptions, SubscriptionStatus } from "@/types/plan";
import { useUserStore } from "../stores/UserStore";
import { useNavigate } from "react-router";
import { apiCall } from "@/utils/api-call";
import { PlanType } from "@/types/payment";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

export default function PricingPage() {
  const { user } = useUserStore();
  const [loading, setLoading] = useState<string>("");
  const [currentPlan, setCurrentPlan] = useState<string>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [plans, setPlans] = useState([]);
  const [showExpiredMessage, setShowExpiredMessage] = useState(false)
  const navigate = useNavigate();

  // Load Razorpay script
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

  // Fetch user data and subscription status
  useEffect(() => {
    fetchUserAndSubscription();
  }, []);

  useEffect(() => {
    const getAllPlans = async () => {
      try {
        const response = await fetch("/api/subscription-tier");

        if (!response.ok) {
          throw new Error(`Failed to fetch plans: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("data", data)
        // Merge by index
        const plansWithExtras = data.data.map((item: any, index: number) => ({
          ...item,
          ...(planExtras[index] || {}), // Fallback to empty object if index doesn't exist
        }));

        setPlans(plansWithExtras);
      } catch (error) {
        console.error("Error fetching plans:", error);
      }
    };

    getAllPlans();
  }, []);



  const fetchUserAndSubscription = async () => {
    if (!user?.id) {
      console.error('No user found');
      setCurrentPlan(null);
      return;
    }

    try {
      const res = await fetch(`/api/subscription/status?userId=${user.id}`);
      const { success, data } = await res.json();
      console.log("success", success, data)
      if (success && data) {
        setSubscriptionStatus(data);
        setCurrentPlan(data.subscription?.planType);
        if (data?.totalSubscriptionsCount > 0) {
          setShowExpiredMessage(true)
        } else {
          setShowExpiredMessage(false)
        }
      } else {
        setCurrentPlan(null);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      setCurrentPlan(null);
    }
  };

  const handleSubscribe = async (planType: string) => {
    // Free plan - just redirect to chat
    if (planType === "free") {
      navigate("/chat");
      return;
    }

    // Check if Razorpay is loaded
    if (!razorpayLoaded) {
      alert("Payment gateway is loading. Please try again in a moment.");
      return;
    }

    // Check if user already has active subscription
    if (subscriptionStatus?.hasActiveSubscription) {
      const confirmUpgrade = confirm(
        `You already have an active ${subscriptionStatus.subscription?.planType} subscription. Do you want to upgrade?`
      );
      if (!confirmUpgrade) return;
    }

    setLoading(planType);

    try {
      // Step 1: Create order using the new backend
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
          // Step 4: Verify payment with backend
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

            console.log("Payment verified successfully:", verifyResponse);

            // CRITICAL: Update current plan immediately for instant UI feedback
            setCurrentPlan(planType);

            alert(
              `🎉 Payment Successful!\n\nYou are now subscribed to the ${orderResponse.data.planName
              }.\nYour subscription is active until ${new Date(
                verifyResponse.data.endDate
              ).toLocaleDateString()}`
            );

            // Refresh subscription status and WAIT for it to complete
            await fetchUserAndSubscription();

            // Redirect to dashboard after UI update
            setTimeout(() => {
              navigate("/chat");
            }, 2000);
          } catch (error) {
            console.error("Payment verification error:", error);
            alert(
              `Payment Verification Failed\n\n${error instanceof Error
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
            console.log("Payment modal closed by user");
            setLoading("");
          },
        },
      };

      // Open Razorpay modal
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Subscribe error:", error);
      alert(
        `Subscription Failed\n\n${error instanceof Error ? error.message : "Please try again later"
        }`
      );
      setLoading("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 py-4 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        {!subscriptionStatus?.hasActiveSubscription && showExpiredMessage && (
          <div className=" bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-4 py-1 rounded text-sm font-medium">
            Your current plan has expired or you've used up all available requests. Please upgrade or renew your plan to continue.          </div>
        )}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Choose Your Path
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Start your spiritual journey with the plan that suits you best
          </p>

          {/* Show current subscription if active */}
          {subscriptionStatus?.hasActiveSubscription && (
            <div className="absolute top-8 right-20 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-4 py-1 rounded text-sm font-medium">
              Current Plan:{" "}
              {subscriptionStatus.subscription?.planType.toUpperCase()}
              {subscriptionStatus.subscription?.daysRemaining &&
                ` • ${subscriptionStatus.subscription.daysRemaining} days remaining`}
            </div>
          )}

        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        {/* FAQ or Additional Info */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            All plans include secure payments via Razorpay • Cancel anytime
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Need help choosing?{" "}
            <a href="/contact" className="text-purple-600 underline">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
