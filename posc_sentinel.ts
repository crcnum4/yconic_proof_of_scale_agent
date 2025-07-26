// yc0n1c's Ambient PoSc Sentinel using Arcade's built-in Stripe tools
import { Arcade } from "@arcadeai/arcadejs";

// Initialize Arcade client
const client = new Arcade();

// Types for PoSc monitoring
interface PoScEvent {
  type: 'revenue_growth' | 'customer_surge' | 'product_usage' | 'sentiment_positive';
  timestamp: Date;
  data: any;
  rationale: string;
  fundingRecommendation?: number;
}

interface RevenueMetrics {
  currentMRR: number;
  previousMRR: number;
  growthRate: number;
  transactionCount: number;
  customerCount: number;
}

class PoScSentinel {
  private userId: string;
  private startupId: string;

  constructor(userId: string, startupId: string) {
    this.userId = userId;
    this.startupId = startupId;
  }

  /**
   * Get Stripe balance using Arcade's built-in tool
   */
  async getStripeBalance() {
    console.log("💰 Fetching Stripe balance via Arcade...");
    
    try {
      console.log("🔍 Calling Arcade tool: Stripe.RetrieveBalance@1.0.0");
      const response = await client.tools.execute({
        tool_name: "Stripe.RetrieveBalance@1.0.0",
        input: {
          "owner": "ArcadeAI",
          "name": "arcade-ai",
          "starred": "true"
        },
        user_id: this.userId,
      });

      console.log("✅ Balance API call successful");
      console.log("📊 Raw response:", JSON.stringify(response, null, 2));
      
      // Parse the output.value which contains the JSON string
      const result = JSON.parse((response as any).output.value);
      console.log("📊 Parsed result:", JSON.stringify(result, null, 2));
      
      return result;
    } catch (error) {
      console.error("❌ Error fetching balance:", error);
      console.error("🔍 Error details:", {
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      return null;
    }
  }

  /**
   * Get Stripe customers using Arcade's built-in tool
   */
  async getStripeCustomers(limit: number = 100) {
    console.log("👥 Fetching Stripe customers via Arcade...");
    
    try {
      console.log("🔍 Calling Arcade tool: Stripe.ListCustomers@1.0.0");
      const response = await client.tools.execute({
        tool_name: "Stripe.ListCustomers@1.0.0",
        input: {
          "owner": "ArcadeAI",
          "name": "arcade-ai",
          "starred": "true",
          "limit": 100
        },
        user_id: this.userId,
      });

      console.log("✅ Customers API call successful");
      console.log("📊 Raw response:", JSON.stringify(response, null, 2));
      
      // Parse the output.value which contains the JSON string
      const customers = JSON.parse((response as any).output.value);
      console.log(`✅ Retrieved ${customers?.length || 0} customers`);
      console.log("📊 Sample customer data:", customers?.[0] ? JSON.stringify(customers[0], null, 2) : "No customers");
      
      return customers || [];
    } catch (error) {
      console.error("❌ Error fetching customers:", error);
      console.error("🔍 Error details:", {
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      return [];
    }
  }

  /**
   * Get Stripe payment intents using Arcade's built-in tool
   */
  async getStripeTransactions(limit: number = 50) {
    console.log("💳 Fetching Stripe transactions via Arcade...");
    
    try {
      console.log("🔍 Calling Arcade tool: Stripe.ListPaymentIntents@1.0.0");
      const response = await client.tools.execute({
        tool_name: "Stripe.ListPaymentIntents@1.0.0",
        input: {
          "owner": "ArcadeAI",
          "name": "arcade-ai",
          "starred": "true",
          "limit": 100
        },
        user_id: this.userId,
      });

      console.log("✅ Transactions API call successful");
      console.log("📊 Raw response:", JSON.stringify(response, null, 2));
      
      // Parse the output.value which contains the JSON string
      const transactions = JSON.parse((response as any).output.value);
      console.log(`✅ Retrieved ${transactions?.length || 0} transactions`);
      console.log("📊 Sample transaction data:", transactions?.[0] ? JSON.stringify(transactions[0], null, 2) : "No transactions");
      
      return transactions || [];
    } catch (error) {
      console.error("❌ Error fetching transactions:", error);
      console.error("🔍 Error details:", {
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      return [];
    }
  }

  /**
   * Get Stripe invoices using Arcade's built-in tool
   */
  async getStripeInvoices(limit: number = 50) {
    console.log("🧾 Fetching Stripe invoices via Arcade...");
    
    try {
      console.log("🔍 Calling Arcade tool: Stripe.ListInvoices@1.0.0");
      const response = await client.tools.execute({
        tool_name: "Stripe.ListInvoices@1.0.0",
        input: {
          "owner": "ArcadeAI",
          "name": "arcade-ai",
          "starred": "true",
          "limit": 100
        },
        user_id: this.userId,
      });

      console.log("✅ Invoices API call successful");
      console.log("📊 Raw response:", JSON.stringify(response, null, 2));
      
      // Parse the output.value which contains the JSON string
      const invoices = JSON.parse((response as any).output.value);
      console.log(`✅ Retrieved ${invoices?.length || 0} invoices`);
      console.log("📊 Sample invoice data:", invoices?.[0] ? JSON.stringify(invoices[0], null, 2) : "No invoices");
      
      return invoices || [];
    } catch (error) {
      console.error("❌ Error fetching invoices:", error);
      console.error("🔍 Error details:", {
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      return [];
    }
  }

  /**
   * Calculate PoSc metrics from real Stripe data
   */
  async calculatePoScMetrics(): Promise<RevenueMetrics | null> {
    console.log("📊 Calculating PoSc metrics from real Stripe data...");
    
    try {
      // Get recent transactions
      const transactions = await this.getStripeTransactions(100);
      const customers = await this.getStripeCustomers(100);
      
      console.log("📊 Transaction analysis:");
      console.log(`  Total transactions: ${transactions.length}`);
      console.log(`  Total customers: ${customers.length}`);
      
      if (!transactions || transactions.length === 0) {
        console.log("📊 No transactions found in Stripe account");
        console.log("💡 Add some test transactions to see PoSc analysis in action");
        console.log("🔍 Debug: Check if Stripe secret is properly configured in Arcade");
        return null;
      }

      // Calculate current period (last 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      console.log("📅 Date ranges:");
      console.log(`  Current period: ${thirtyDaysAgo.toISOString()} to ${now.toISOString()}`);
      console.log(`  Previous period: ${sixtyDaysAgo.toISOString()} to ${thirtyDaysAgo.toISOString()}`);

      // Filter transactions by date
      const currentTransactions = transactions.filter((t: any) => {
        const created = new Date(t.created * 1000);
        return created >= thirtyDaysAgo;
      });
      
      const previousTransactions = transactions.filter((t: any) => {
        const date = new Date(t.created * 1000);
        return date >= sixtyDaysAgo && date < thirtyDaysAgo;
      });

      console.log("📊 Filtered transactions:");
      console.log(`  Current period: ${currentTransactions.length}`);
      console.log(`  Previous period: ${previousTransactions.length}`);

      // Calculate MRR
      const currentMRR = this.calculateMRR(currentTransactions);
      const previousMRR = this.calculateMRR(previousTransactions);
      
      const growthRate = previousMRR > 0 ? ((currentMRR - previousMRR) / previousMRR) * 100 : 0;

      const metrics: RevenueMetrics = {
        currentMRR,
        previousMRR,
        growthRate,
        transactionCount: currentTransactions.length,
        customerCount: customers.length
      };

      console.log("📈 PoSc Metrics calculated:");
      console.log(`  Current MRR: $${currentMRR.toLocaleString()}`);
      console.log(`  Previous MRR: $${previousMRR.toLocaleString()}`);
      console.log(`  Growth Rate: ${growthRate.toFixed(1)}%`);
      console.log(`  Transactions: ${metrics.transactionCount}`);
      console.log(`  Customers: ${metrics.customerCount}`);

      return metrics;
    } catch (error) {
      console.error("❌ Error calculating PoSc metrics:", error);
      console.error("🔍 Error details:", {
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      return null;
    }
  }

  /**
   * Calculate MRR from transactions
   */
  private calculateMRR(transactions: any[]): number {
    console.log("🧮 Calculating MRR from transactions...");
    
    // Group by customer and sum their payments
    const customerTotals = new Map<string, number>();
    
    transactions.forEach((transaction, index) => {
      console.log(`  Transaction ${index + 1}:`, {
        id: transaction.id,
        customer: transaction.customer,
        amount: transaction.amount,
        status: transaction.status
      });
      
      if (transaction.amount && transaction.status === 'succeeded') {
        // Use transaction ID as customer ID if customer is null (common in test data)
        const customerId = transaction.customer || `anon_${transaction.id}`;
        const amount = transaction.amount / 100; // Convert from cents to dollars
        customerTotals.set(customerId, (customerTotals.get(customerId) || 0) + amount);
      }
    });

    // Sum all customer totals to get MRR
    const mrr = Array.from(customerTotals.values()).reduce((sum, amount) => sum + amount, 0);
    console.log(`  Calculated MRR: $${mrr.toLocaleString()}`);
    
    return mrr;
  }

  /**
   * Evaluate PoSc milestones
   */
  evaluatePoScMilestones(metrics: RevenueMetrics): PoScEvent | null {
    const REVENUE_GROWTH_THRESHOLD = 20; // 20% MoM growth
    const MRR_THRESHOLD = 25000; // $25K MRR milestone
    const TRANSACTION_VOLUME_THRESHOLD = 100; // 100+ transactions

    let event: PoScEvent | null = null;

    // Check for significant revenue growth
    if (metrics.growthRate >= REVENUE_GROWTH_THRESHOLD) {
      event = {
        type: 'revenue_growth',
        timestamp: new Date(),
        data: metrics,
        rationale: `Revenue growth of ${metrics.growthRate.toFixed(1)}% MoM detected. Current MRR: $${metrics.currentMRR.toLocaleString()}. This represents sustained traction and validates product-market fit.`,
        fundingRecommendation: Math.round(metrics.currentMRR * 0.6)
      };
    }
    // Check for MRR milestone
    else if (metrics.currentMRR >= MRR_THRESHOLD && metrics.previousMRR < MRR_THRESHOLD) {
      event = {
        type: 'revenue_growth',
        timestamp: new Date(),
        data: metrics,
        rationale: `Major MRR milestone achieved: $${metrics.currentMRR.toLocaleString()}. This represents a significant scale inflection point.`,
        fundingRecommendation: 15000
      };
    }
    // Check for high transaction volume
    else if (metrics.transactionCount >= TRANSACTION_VOLUME_THRESHOLD && metrics.growthRate > 10) {
      event = {
        type: 'revenue_growth',
        timestamp: new Date(),
        data: metrics,
        rationale: `High transaction volume (${metrics.transactionCount} transactions) with ${metrics.growthRate.toFixed(1)}% growth indicates strong market adoption.`,
        fundingRecommendation: Math.round(metrics.currentMRR * 0.4)
      };
    }

    return event;
  }

  /**
   * Run complete PoSc monitoring
   */
  async runPoScMonitoring() {
    console.log("🤖 Starting yc0n1c's PoSc Sentinel");
    console.log("Using Real Stripe Data via Arcade Tools");
    console.log("=".repeat(50));

    try {
      // 1. Get balance information
      const balance = await this.getStripeBalance();
      
      // 2. Calculate PoSc metrics
      const metrics = await this.calculatePoScMetrics();
      
      if (!metrics) {
        console.log("📊 No PoSc metrics available (no transactions found)");
        console.log("💡 This is normal for a new Stripe test account");
        console.log("💡 Add some test payments to see the full PoSc analysis");
        console.log("🔍 Debug: Check Arcade secrets and Stripe configuration");
        return;
      }

      // 3. Evaluate milestones
      const event = this.evaluatePoScMilestones(metrics);

      // 4. Generate report
      this.generateReport(event, metrics, balance);

    } catch (error) {
      console.error("❌ Error in PoSc monitoring:", error);
      console.error("🔍 Error details:", {
        message: (error as Error).message,
        stack: (error as Error).stack
      });
    }
  }

  /**
   * Generate comprehensive report
   */
  private generateReport(event: PoScEvent | null, metrics: RevenueMetrics, balance: any) {
    console.log("\n📋 POSC SENTINEL REPORT (Real Stripe Data)");
    console.log("=".repeat(50));
    
    if (event) {
      console.log("🚀 POSC EVENT DETECTED!");
      console.log(`Type: ${event.type}`);
      console.log(`Timestamp: ${event.timestamp.toISOString()}`);
      console.log(`Rationale: ${event.rationale}`);
      console.log(`Funding Recommendation: $${event.fundingRecommendation?.toLocaleString()}`);
      
      console.log("\n📬 VAULT INBOX APPROVAL REQUEST:");
      console.log(`Subject: PoSc Milestone - ${event.type.replace('_', ' ').toUpperCase()}`);
      console.log(`Action Required: Approve $${event.fundingRecommendation?.toLocaleString()} funding release`);
      console.log(`Reasoning: ${event.rationale}`);
      console.log("Status: Pending Human Approval");
    } else {
      console.log("📊 No PoSc events detected in this cycle");
      console.log("📈 Current metrics are below threshold levels");
    }

    console.log(`\n💰 Stripe Balance:`);
    if (balance) {
      console.log(`Available: $${(balance.available?.[0]?.amount || 0) / 100}`);
      console.log(`Pending: $${(balance.pending?.[0]?.amount || 0) / 100}`);
    } else {
      console.log("Balance information unavailable");
    }

    console.log("\n" + "=".repeat(50));
    console.log("🤖 PoSc monitoring cycle complete");
  }
}

// Export the main function for use in index.ts
export async function runPoScSentinel() {
  console.log("🚀 yc0n1c's Ambient PoSc Sentinel");
  console.log("Enterprise + Ambient Agents Hackathon");
  console.log("Real Stripe Data via Arcade Tools");
  console.log("=".repeat(60));

  const sentinel = new PoScSentinel(
    "johnlennyt@gmail.com",
    "yc0n1c_posc"
  );

  await sentinel.runPoScMonitoring();
} 