// Import Prisma enums (these will be auto-generated)
import { SubscriptionStatus, PaymentStatus, PaymentMethodType } from '@/lib/generated/prisma';

// Plan types (not in Prisma enum, so we define here)
export enum PlanType {
  FREE = 'free',
  ONETIME = 'one-time',
  MONTHLY = 'premium-monthly',
  ANNUALLY = 'premium-yearly',
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

// Razorpay Payment Response Types
export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayPaymentDetails {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id: string;
  invoice_id: string | null;
  international: boolean;
  method: 'card' | 'netbanking' | 'wallet' | 'upi' | 'emi' | 'cardless_emi';
  amount_refunded: number;
  refund_status: string | null;
  captured: boolean;
  description: string;
  card_id: string | null;
  bank: string | null;
  wallet: string | null;
  vpa: string | null;
  email: string;
  contact: string;
  customer_id: string | null;
  token_id: string | null;
  notes: Record<string, any>;
  fee: number | null;
  tax: number | null;
  error_code: string | null;
  error_description: string | null;
  error_source: string | null;
  error_step: string | null;
  error_reason: string | null;
  acquirer_data: {
    auth_code?: string;
    authentication_reference_number?: string;
  };
  created_at: number;
  card?: RazorpayCardDetails;
  upi?: RazorpayUPIDetails;
}

export interface RazorpayCardDetails {
  id: string;
  entity: string;
  name: string;
  last4: string;
  network: 'Visa' | 'MasterCard' | 'Maestro' | 'RuPay' | 'American Express' | 'Diners Club' | 'Unknown';
  type: 'credit' | 'debit' | 'prepaid' | 'unknown';
  issuer: string | null;
  international: boolean;
  emi: boolean;
  sub_type: 'consumer' | 'business' | 'unknown';
  token_iin: string | null;
}

export interface RazorpayUPIDetails {
  vpa: string;
  flow?: string;
}

export interface RazorpayTokenDetails {
  id: string;
  entity: string;
  token: string;
  bank: string | null;
  wallet: string | null;
  method: string;
  card?: {
    last4: string;
    network: string;
    type: string;
    issuer: string;
    name: string;
    emi: boolean;
    sub_type: string;
  };
  vpa?: string;
  recurring: boolean;
  recurring_details?: {
    status: string;
    failure_reason: string | null;
  };
  auth_type: string | null;
  mrn: string | null;
  used_at: number;
  created_at: number;
  expired_at: number;
  dcc_enabled: boolean;
  max_amount: number | null;
  used_count: number;
}

// Payment Method DTOs
export interface CreatePaymentMethodDTO {
  type: PaymentMethodType;

  // Card fields
  cardType?: string;
  cardNetwork?: string;
  cardLast4?: string;
  cardIssuer?: string;
  cardName?: string;
  cardExpMonth?: string;
  cardExpYear?: string;
  cardTokenId?: string;
  cardFingerPrint?: string;

  // UPI fields
  upiVpa?: string;

  // Netbanking fields
  bankName?: string;

  // Wallet fields
  walletName?: string;

  // Common fields
  isDefault?: boolean;
  nickname?: string;
}

export interface UpdatePaymentMethodDTO {
  isDefault?: boolean;
  isActive?: boolean;
  nickname?: string;
}

export interface PaymentMethodResponse {
  id: string;
  userId: string;
  type: PaymentMethodType;

  // Masked card details for frontend
  displayInfo: string; // e.g., "Visa •••• 1234" or "user@paytm"
  cardType?: string;
  cardNetwork?: string;
  cardLast4?: string;
  cardExpMonth?: string;
  cardExpYear?: string;

  // UPI
  upiVpa?: string;

  // Netbanking
  bankName?: string;

  // Wallet
  walletName?: string;

  isDefault: boolean;
  isActive: boolean;
  nickname?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SavePaymentMethodFromRazorpayDTO {
  userId: string;
  razorpayPaymentId: string;
  saveCard?: boolean; // User consent to save card
  nickname?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaymentMethodListResponse {
  paymentMethods: PaymentMethodResponse[];
  defaultPaymentMethodId: string | null;
}

// Razorpay Order Creation

export interface RazorpayOrderOptions {
  amount: number;
  currency: string;
  receipt: string;
  notes: Record<string, any>;
  customer_id?: string;
}

export interface CreateRazorpayOrderDTO {
  amount: number; // in smallest currency unit (paise for INR)
  currency: string;
  subscriptionId: string;
  userId: string;
  notes?: Record<string, any>;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  offer_id: string | null;
  status: string;
  attempts: number;
  notes: Record<string, any>;
  created_at: number;
}

// Payment Verification
export interface VerifyPaymentDTO {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  subscriptionId: string;
  savePaymentMethod?: boolean;
  paymentMethodNickname?: string;
}

// Error Types
export class PaymentMethodError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'PaymentMethodError';
  }
}

export class RazorpayError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'RazorpayError';
  }
}