// Types for yc0n1c's Ambient PoSc Sentinel MongoDB Integration

// ============================================================================
// STRIPE DATA TYPES
// ============================================================================

export interface StripeBalance {
  object: string;
  available: Array<{
    amount: number;
    currency: string;
    source_types: {
      card: number;
    };
  }>;
  livemode: boolean;
  pending: Array<{
    amount: number;
    currency: string;
    source_types: {
      card: number;
    };
  }>;
  refund_and_dispute_prefunding: {
    available: Array<{
      amount: number;
      currency: string;
    }>;
    pending: Array<{
      amount: number;
      currency: string;
    }>;
  };
}

export interface StripeTransaction {
  id: string;
  object: string;
  amount: number;
  amount_capturable: number;
  amount_details: {
    tip: Record<string, any>;
  };
  amount_received: number;
  application: string | null;
  application_fee_amount: number | null;
  automatic_payment_methods: {
    allow_redirects: string;
    enabled: boolean;
  };
  canceled_at: number | null;
  cancellation_reason: string | null;
  capture_method: string;
  client_secret: string;
  confirmation_method: string;
  created: number;
  currency: string;
  customer: string | null;
  description: string | null;
  invoice: string | null;
  last_payment_error: any | null;
  latest_charge: string | null;
  livemode: boolean;
  metadata: {
    order_source: string;
    test?: string;
  };
  next_action: any | null;
  on_behalf_of: string | null;
  payment_method: string | null;
  payment_method_configuration_details: {
    id: string;
    parent: string | null;
  };
  payment_method_options: Record<string, any>;
  payment_method_types: string[];
  processing: any | null;
  receipt_email: string | null;
  review: any | null;
  setup_future_usage: string | null;
  shipping: any | null;
  source: any | null;
  statement_descriptor: string | null;
  statement_descriptor_suffix: string | null;
  status: 'succeeded' | 'requires_payment_method' | 'canceled' | 'processing' | 'requires_confirmation';
  transfer_data: any | null;
  transfer_group: string | null;
}

export interface StripeCustomer {
  id: string;
  object: string;
  created: number;
  email: string | null;
  livemode: boolean;
  metadata: Record<string, any>;
  name: string | null;
  phone: string | null;
  preferred_locales: string[];
  shipping: any | null;
  tax_exempt: string;
  test_clock: string | null;
}

export interface StripeInvoice {
  id: string;
  object: string;
  account_country: string;
  account_name: string;
  account_tax_ids: any[];
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  application_fee_amount: number | null;
  attempt_count: number;
  attempted: boolean;
  auto_advance: boolean;
  automatic_tax: {
    enabled: boolean;
    status: string | null;
  };
  billing_reason: string;
  charge: string | null;
  collection_method: string;
  created: number;
  currency: string;
  custom_fields: any[];
  customer: string | null;
  customer_address: any | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_shipping: any | null;
  customer_tax_exempt: string;
  customer_tax_ids: any[];
  default_payment_method: string | null;
  default_source: string | null;
  default_tax_rates: any[];
  description: string | null;
  discount: any | null;
  discounts: any[];
  due_date: number | null;
  ending_balance: number | null;
  footer: string | null;
  from_invoice: any | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  last_finalization_error: any | null;
  last_sent_at: number | null;
  latest_revision: string | null;
  livemode: boolean;
  metadata: Record<string, any>;
  next_payment_attempt: number | null;
  number: string;
  on_behalf_of: string | null;
  paid: boolean;
  paid_out_of_band: boolean;
  payment_intent: string | null;
  payment_settings: {
    payment_method_options: any | null;
    payment_method_types: any | null;
  };
  period_end: number;
  period_start: number;
  post_payment_credit_notes_amount: number;
  pre_payment_credit_notes_amount: number;
  quote: string | null;
  receipt_number: string | null;
  rendering_options: any | null;
  shipping_cost: any | null;
  shipping_details: any | null;
  starting_balance: number;
  statement_descriptor: string | null;
  status: string;
  status_transitions: {
    finalized_at: number | null;
    marked_uncollectible_at: number | null;
    paid_at: number | null;
    voided_at: number | null;
  };
  subscription: string | null;
  subtotal: number;
  subtotal_excluding_tax: number;
  tax: number | null;
  test_clock: string | null;
  total: number;
  total_discount_amounts: any[];
  total_tax_amounts: any[];
  transfer_data: any | null;
  webhooks_delivered_at: number | null;
}

// ============================================================================
// POSC METRICS TYPES
// ============================================================================

export interface RevenueMetrics {
  currentMRR: number;
  previousMRR: number;
  growthRate: number;
  transactionCount: number;
  customerCount: number;
  totalRevenue: number;
  averageTransactionValue: number;
  successRate: number;
  currency: string;
}

export interface PoScEvent {
  type: 'revenue_growth' | 'customer_surge' | 'product_usage' | 'sentiment_positive' | 'mrr_milestone' | 'transaction_volume';
  timestamp: Date;
  data: RevenueMetrics;
  rationale: string;
  fundingRecommendation?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  metadata: Record<string, any>;
}

export interface PoScMilestone {
  id: string;
  name: string;
  description: string;
  threshold: number;
  metric: 'mrr' | 'growth_rate' | 'transaction_count' | 'customer_count';
  achieved: boolean;
  achievedAt?: Date;
  value: number;
}

// ============================================================================
// MONGODB DOCUMENT TYPES
// ============================================================================

export interface PoScSnapshot {
  _id?: string;
  timestamp: Date;
  startupId: string;
  userId: string;
  
  // Stripe Data
  stripeBalance: StripeBalance;
  transactions: StripeTransaction[];
  customers: StripeCustomer[];
  invoices: StripeInvoice[];
  
  // Calculated Metrics
  revenueMetrics: RevenueMetrics;
  
  // PoSc Events
  events: PoScEvent[];
  
  // Milestones
  milestones: PoScMilestone[];
  
  // Metadata
  metadata: {
    version: string;
    source: 'arcade_stripe';
    environment: 'test' | 'production';
    processingTime: number;
    arcadeExecutionId: string;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface PoScEventLog {
  _id?: string;
  eventId: string;
  startupId: string;
  userId: string;
  event: PoScEvent;
  timestamp: Date;
  status: 'triggered' | 'processed' | 'approved' | 'rejected' | 'executed';
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface StartupProfile {
  _id?: string;
  startupId: string;
  userId: string;
  name: string;
  description?: string;
  
  // Configuration
  poscThresholds: {
    revenueGrowthThreshold: number;
    mrrMilestoneThreshold: number;
    transactionVolumeThreshold: number;
    customerGrowthThreshold: number;
  };
  
  // Current State
  currentMetrics: RevenueMetrics;
  lastSnapshotAt: Date;
  
  // Metadata
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ArcadeResponse<T> {
  id: string;
  execution_id: string;
  execution_type: string;
  finished_at: string;
  duration: number;
  status: 'success' | 'error';
  output: {
    value: string; // JSON stringified data
  };
  success: boolean;
}

export interface MongoDBInsertResult {
  acknowledged: boolean;
  insertedId: string;
}

export interface MongoDBUpdateResult {
  acknowledged: boolean;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
  upsertedId?: string;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface MongoDBConfig {
  uri: string;
  database: string;
  collections: {
    snapshots: string;
    events: string;
    startups: string;
  };
  options: {
    retryWrites: boolean;
    w: string;
    appName: string;
  };
}

export interface PoScConfig {
  userId: string;
  startupId: string;
  thresholds: {
    revenueGrowthThreshold: number;
    mrrMilestoneThreshold: number;
    transactionVolumeThreshold: number;
    customerGrowthThreshold: number;
  };
  monitoring: {
    intervalMinutes: number;
    enabled: boolean;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type TransactionStatus = 'succeeded' | 'requires_payment_method' | 'canceled' | 'processing' | 'requires_confirmation';

export type PoScEventType = 'revenue_growth' | 'customer_surge' | 'product_usage' | 'sentiment_positive' | 'mrr_milestone' | 'transaction_volume';

export type Environment = 'test' | 'production';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type EventStatus = 'pending' | 'approved' | 'rejected' | 'executed'; 