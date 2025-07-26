# Quick Setup for yc0n1c PoSc Sentinel

## 🚀 Your Stripe Configuration

**Label**: `yc0n1c posc`  
**Secret Key**: `sk_test_51RlKkZQ4tvThiVucn3BPTRwShZQPP0a7ObA2lwqZmZj6w73OTyrwVTEfW6NzGtT2n3Yxn8vNvM2GBFKNy2SzElUd00WTpeuepf`

## 📋 Step 1: Set Up Arcade Secrets

1. Go to [Arcade Dashboard](https://arcade.ai)
2. Navigate to **Auth > Secrets**
3. Click **+ Add Secret**
4. Enter:
   - **ID**: `STRIPE_SECRET_KEY`
   - **Secret Value**: `sk_test_51RlKkZQ4tvThiVucn3BPTRwShZQPP0a7ObA2lwqZmZj6w73OTyrwVTEfW6NzGtT2n3Yxn8vNvM2GBFKNy2SzElUd00WTpeuepf`
   - **Description**: `yc0n1c posc Stripe test key`
5. Click **Submit**

## 🔧 Step 2: Set Environment Variable

Create a `.env` file in your project root:
```env
ARCADE_API_KEY=your_arcade_api_key_here
```

## 🧪 Step 3: Test the Integration

```bash
# Run the PoSc Sentinel with real Stripe data
bun run index.ts
```

## 📊 What You'll See

The system will:
1. ✅ Connect to Arcade using your API key
2. ✅ Access Stripe data using the secret you configured
3. ✅ Calculate real PoSc metrics from your Stripe transactions
4. ✅ Detect milestones and generate funding recommendations
5. ✅ Create approval requests for the Vault Inbox

## 🎯 Expected Output

```
🚀 yc0n1c's Ambient PoSc Sentinel
Enterprise + Ambient Agents Hackathon
Real Stripe Data via Arcade Tools
============================================================
🤖 Starting yc0n1c's PoSc Sentinel
Using Real Stripe Data via Arcade Tools
==================================================
💰 Fetching Stripe balance via Arcade...
✅ Balance retrieved successfully
💳 Fetching Stripe transactions via Arcade...
✅ Retrieved X transactions
👥 Fetching Stripe customers via Arcade...
✅ Retrieved X customers
📊 Calculating PoSc metrics from real Stripe data...
📈 PoSc Metrics calculated:
  Current MRR: $X,XXX
  Previous MRR: $X,XXX
  Growth Rate: XX.X%
  Transactions: XX
  Customers: XX

📋 POSC SENTINEL REPORT (Real Stripe Data)
==================================================
📊 No PoSc events detected in this cycle
📈 Current metrics are below threshold levels

💰 Stripe Balance:
Available: $X.XX
Pending: $X.XX

==================================================
🤖 PoSc monitoring cycle complete
```

## 🔍 Troubleshooting

### If you get "Tool not found" errors:
- Arcade has built-in Stripe tools, so this should work out of the box
- Make sure your Arcade API key is correct

### If you get "Secret not found" errors:
- Verify the secret ID is exactly `STRIPE_SECRET_KEY`
- Check that the secret is active in Arcade dashboard

### If you get Stripe API errors:
- Your test key should work fine for development
- Check that you have some test transactions in your Stripe dashboard

## 🎉 Success!

Once this is working, you'll have a real ambient PoSc monitoring system that:
- Uses your actual Stripe test data
- Calculates real MRR and growth metrics
- Detects genuine PoSc milestones
- Generates authentic funding recommendations

Perfect for your hackathon demo! 🏆 