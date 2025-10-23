// Import Prisma enums (these will be auto-generated)
import { SubscriptionStatus, PaymentStatus } from '@/lib/generated/prisma';

// Plan types (not in Prisma enum, so we define here)
export enum PlanType {
  FREE = 'free',
  MONTHLY = 'premium-monthly',
  ANNUALLY = 'premium-annually',
  FAMILY = 'family'
}

// Re-export Prisma enums for convenience
export { SubscriptionStatus, PaymentStatus };

// Database Models
export interface User {
  id: number;
  email: string;
  name: string | null;
  created_at: Date;
}

export interface Subscription {
  id: number;
  user_id: number;
  plan_type: PlanType;
  status: SubscriptionStatus;
  razorpay_subscription_id: string | null;
  razorpay_plan_id: string | null;
  razorpay_customer_id: string | null;
  amount: number;
  currency: string;
  start_date: Date | null;
  end_date: Date | null;
  next_billing_date: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Payment {
  id: number;
  user_id: number;
  subscription_id: number | null;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  razorpay_signature: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  description: string | null;
  notes: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

export interface WebhookEvent {
  id: number;
  event_id: string;
  event_type: string;
  payload: Record<string, any>;
  processed: boolean;
  processed_at: Date | null;
  created_at: Date;
}

// Pricing Plan Interface
export interface PricingPlan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  period: 'monthly' | 'yearly';
  interval: number;
  description: string;
  features: string[];
}

// API Request/Response Types
export interface CreateSubscriptionRequest {
  planType: PlanType;
  userId: number;
}

export interface CreateSubscriptionResponse {
  subscriptionId: string;
  orderId: string;
  amount: number;
  currency: string;
  key: string;
}

export interface VerifyPaymentRequest {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  userId: number;
}

export interface VerifyPaymentResponse {
  success: boolean;
  subscriptionId?: number;
  message: string;
}

// Razorpay API Types
export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, any>;
  created_at: number;
}

export interface RazorpayPayment {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  method: string;
  captured: boolean;
  email: string;
  contact: string;
  created_at: number;
}

export interface RazorpaySubscription {
  id: string;
  entity: string;
  plan_id: string;
  customer_id: string;
  status: string;
  current_start: number;
  current_end: number;
  ended_at: number | null;
  quantity: number;
  notes: Record<string, any>;
  charge_at: number;
  start_at: number;
  end_at: number;
  auth_attempts: number;
  total_count: number;
  paid_count: number;
  created_at: number;
}

export interface RazorpayWebhookPayload {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment?: {
      entity: RazorpayPayment;
    };
    subscription?: {
      entity: RazorpaySubscription;
    };
    order?: {
      entity: RazorpayOrder;
    };
  };
  created_at: number;
}

// Error Types
export class PaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}