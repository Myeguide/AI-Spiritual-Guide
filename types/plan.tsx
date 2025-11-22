import { PlanType } from "./payment";

export interface Plan {
  id: string;
  type: string;
  name: string;
  price: number;
  displayPrice: string;
  description: string;
  features: string[];
  icon: string;
  badge?: string;
  totalRequests: string;
}

export const planExtras = [
  {
    planType: PlanType.MONTHLY,
    icon: "zap",
    badge: "Best Value",
  },
  {
    planType: PlanType.ANNUALLY,
    icon: "crown",
    badge: "Most Popular",
  },
  {
    planType: PlanType.FREE,
    icon: "users",
  },
];

export interface Subscription {
  expiresAt: string;
  hasActiveSubscription: boolean;
  isExpired: boolean;
  statusMessage: string;
  subscription: {
    id: string;
    amount: string;
    cancelledAt: null;
    createdAt: string;
    currency: string;
    expiresAt: string;
    planType: string;
    requestsUsed: number;
    startDate: string;
    status: string;
    tier: object;
    tierId: string;
    totalRequests: number;
    updatedAt: string;
    userId: string;
  };
  totalSubscriptionsCount: number;
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
  tokenId?: string;
  customerId?: string;
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => Promise<void>;
  prefill: RazorpayPrefill;
  theme: RazorpayTheme;
  modal: RazorpayModal;
}
