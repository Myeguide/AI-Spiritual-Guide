import { Sparkles, Users, Zap, Crown } from "lucide-react";

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

export const plans: Plan[] = [
  {
    type: "free",
    name: "Free",
    price: 0,
    displayPrice: "₹0",
    description: "Perfect for trying out EternalGuide",
    billingCycle: "Forever",
    icon: <Sparkles className="w-6 h-6" />,
    features: [
      "5 free prompts",
      "Basic spiritual guidance",
      "Limited conversation history",
      "Community support",
    ],
  },
  {
    type: "premium-monthly",
    name: "Monthly",
    price: 499,
    displayPrice: "₹499",
    description: "Best for regular seekers",
    billingCycle: "per month",
    icon: <Zap className="w-6 h-6" />,
    popular: true,
    badge: "Most Popular",
    features: [
      "Unlimited conversations",
      "Advanced AI responses",
      "Full conversation history",
      "Priority support",
      "WhatsApp integration",
      "1M tokens per month",
    ],
  },
  {
    type: "premium-yearly",
    name: "Annual",
    price: 1999,
    displayPrice: "₹1,999",
    description: "Save 67% with annual plan",
    billingCycle: "per year",
    icon: <Crown className="w-6 h-6" />,
    badge: "Best Value",
    features: [
      "Everything in Monthly",
      "Save ₹4,000 annually",
      "Extended token limits (12M)",
      "Premium support",
      "Early access to new features",
      "Personalized guidance",
    ],
  },
  {
    type: "family",
    name: "Family",
    price: 5999,
    displayPrice: "₹5,999",
    description: "Share wisdom with your family",
    billingCycle: "per year",
    icon: <Users className="w-6 h-6" />,
    badge: "Best for Families",
    features: [
      "Everything in Annual",
      "Up to 4 family members",
      "Shared token pool (50M)",
      "Individual profiles & memories",
      "Family dashboard",
      "Dedicated support",
      "Perfect for spiritual families",
    ],
  },
];

export const planExtras = [
  {
    displayPrice: "₹0",
    billingCycle: "5 Message",
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    displayPrice: "₹499",
    billingCycle: "50 Message",
    icon: <Zap className="w-6 h-6" />,
    popular: true,
    badge: "Most Popular",
  },
  {
    displayPrice: "₹1,999",
    billingCycle: "500 Message",
    icon: <Crown className="w-6 h-6" />,
    badge: "Best Value",
  },
  {
    displayPrice: "₹5,999",
    billingCycle: "1500 Message",
    icon: <Users className="w-6 h-6" />,
    badge: "Best for Families",
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
