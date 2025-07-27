import { client } from "./mongoClient";

interface PoScResult {
  startupId: string;
  userId: string;
  metrics: {
    currentMRR: number;
    previousMRR: number;
    growthRate: number;
    transactionCount: number;
    customerCount: number;
  };
  event?: {
    type: string;
    timestamp: Date;
    data: any;
    rationale: string;
    fundingRecommendation?: number;
  };
  balance?: any;
  transactions?: any[];
  customers?: any[];
  invoices?: any[];
  startupMentions?: any;
  sentimentTrends?: any;
  rawData?: {
    balance?: any;
    transactions?: any[];
    customers?: any[];
    invoices?: any[];
    scrapingResults?: any;
  };
}

export async function savePoScResult(data: PoScResult) {
  try {
    console.log("💾 Saving ALL PoSc data to MongoDB...");
    console.log("=".repeat(60));
    
    // Connect to MongoDB
    const mongoClient = await client.connect();
    const db = mongoClient.db("yconic_posc_agent");
    const collection = db.collection("posc_results");
    
    // Prepare data for storage with dollar conversions
    const resultData = {
      ...data,
      timestamp: new Date(),
      createdAt: new Date(),
      metadata: {
        version: '1.0.0',
        source: 'arcade_stripe',
        environment: 'production',
        dataTypes: {
          hasBalance: !!data.balance,
          hasTransactions: !!data.transactions?.length,
          hasCustomers: !!data.customers?.length,
          hasInvoices: !!data.invoices?.length,
          hasRawData: !!data.rawData
        }
      }
    };
    
    // Log comprehensive data summary
    console.log("📊 COMPLETE DATA BEING STORED:");
    console.log("=".repeat(40));
    console.log("🏢 Startup ID:", resultData.startupId);
    console.log("👤 User ID:", resultData.userId);
    
    // Log metrics
    console.log("\n📈 REVENUE METRICS:");
    console.log("  Current MRR:", `$${resultData.metrics.currentMRR.toFixed(2)}`);
    console.log("  Previous MRR:", `$${resultData.metrics.previousMRR.toFixed(2)}`);
    console.log("  Growth Rate:", `${resultData.metrics.growthRate.toFixed(1)}%`);
    console.log("  Transaction Count:", resultData.metrics.transactionCount);
    console.log("  Customer Count:", resultData.metrics.customerCount);
    
    // Log balance information
    if (resultData.balance) {
      const availableAmount = (resultData.balance.available?.[0]?.amount || 0) / 100;
      const pendingAmount = (resultData.balance.pending?.[0]?.amount || 0) / 100;
      console.log("\n💰 STRIPE BALANCE:");
      console.log("  Available:", `$${availableAmount.toFixed(2)}`);
      console.log("  Pending:", `$${pendingAmount.toFixed(2)}`);
      console.log("  Total:", `$${(availableAmount + pendingAmount).toFixed(2)}`);
    }
    
    // Log transaction summary
    if (resultData.transactions?.length) {
      console.log("\n💳 TRANSACTIONS SUMMARY:");
      console.log("  Total Transactions:", resultData.transactions.length);
      
      // Calculate successful vs failed
      const successful = resultData.transactions.filter((t: any) => t.status === 'succeeded');
      const failed = resultData.transactions.filter((t: any) => t.status !== 'succeeded');
      console.log("  Successful:", successful.length);
      console.log("  Failed/Canceled:", failed.length);
      
      // Show total amounts
      const totalAmount = successful.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) / 100;
      console.log("  Total Revenue (Successful):", `$${totalAmount.toFixed(2)}`);
      
      // Show sample transaction
      if (successful.length > 0) {
        const sample = successful[0];
        console.log("  Sample Transaction:");
        console.log("    ID:", sample.id);
        console.log("    Amount:", `$${(sample.amount || 0) / 100}`);
        console.log("    Status:", sample.status);
        console.log("    Created:", new Date(sample.created * 1000).toISOString());
      }
    }
    
    // Log customer summary
    if (resultData.customers?.length) {
      console.log("\n👥 CUSTOMERS SUMMARY:");
      console.log("  Total Customers:", resultData.customers.length);
      if (resultData.customers.length > 0) {
        const sample = resultData.customers[0];
        console.log("  Sample Customer:");
        console.log("    ID:", sample.id);
        console.log("    Email:", sample.email);
        console.log("    Created:", new Date(sample.created * 1000).toISOString());
      }
    }
    
    // Log invoice summary
    if (resultData.invoices?.length) {
      console.log("\n🧾 INVOICES SUMMARY:");
      console.log("  Total Invoices:", resultData.invoices.length);
      if (resultData.invoices.length > 0) {
        const sample = resultData.invoices[0];
        console.log("  Sample Invoice:");
        console.log("    ID:", sample.id);
        console.log("    Amount Paid:", `$${(sample.amount_paid || 0) / 100}`);
        console.log("    Status:", sample.status);
      }
    }
    
    // Log event if triggered
    if (resultData.event) {
      console.log("\n🚀 POSC EVENT:");
      console.log("  Type:", resultData.event.type);
      console.log("  Rationale:", resultData.event.rationale);
      console.log("  Funding Recommendation:", `$${resultData.event.fundingRecommendation?.toFixed(2) || 'N/A'}`);
    }
    
    // Insert the complete data
    const result = await collection.insertOne(resultData);
    
    console.log("\n✅ COMPLETE PoSc data saved successfully!");
    console.log("📋 Document ID:", result.insertedId);
    console.log("📅 Timestamp:", resultData.timestamp.toISOString());
    console.log("📊 Data Types Stored:", resultData.metadata.dataTypes);
    
    return result.insertedId;
    
  } catch (error) {
    console.error("❌ Failed to save PoSc data:", error);
    throw error;
  }
}
