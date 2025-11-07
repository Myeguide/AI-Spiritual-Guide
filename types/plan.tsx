import { Sparkles, Users, Zap, Crown } from "lucide-react";
import { PlanType } from "./payment";

export interface Plan {
  type: string;
  name: string;
  price: number;
  displayPrice: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
  badge?: string;
  billingCycle: string;
}


export const planExtras = [
  {
    planType: PlanType.FAMILY,
    icon: <Sparkles className="w-6 h-6" />,
    badge: "Best for Families",
  },
  {
    planType: PlanType.MONTHLY,
    icon: <Zap className="w-6 h-6" />,
    popular: true,
    badge: "Best Value",
  },
  {
    planType: PlanType.ANNUALLY,
    icon: <Crown className="w-6 h-6" />,
    badge: "Most Popular",
  },
  {
    planType: PlanType.FREE,
    icon: <Users className="w-6 h-6" />,
  },
];

export interface Subscription {
  id: number;
  planType: string;
  status: string;
  startDate: string;
  endDate: string;
  daysRemaining: number;
}

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscription: Subscription | null;
}

// Step 3: Configure and open Razorpay checkout
interface RazorpayPrefill {
  firstName: string;
  lastName: string;
  email: string;
  contact: string;
}

interface RazorpayTheme {
  color: string;
}

interface RazorpayModal {
  ondismiss: () => void;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image: string;
  order_id: string;
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => Promise<void>;
  prefill: RazorpayPrefill;
  theme: RazorpayTheme;
  modal: RazorpayModal;
}
