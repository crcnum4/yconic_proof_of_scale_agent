# yc0n1c's Ambient PoSc Sentinel

**Enterprise + Ambient Agents Hackathon Implementation**

A real-time, ambient AI agent that continuously monitors Proof-of-Scale (PoSc) metrics from startups using real Stripe transaction data via Arcade tools and automatically triggers funding events when milestones are achieved.

## 🚀 Features

- **Real Stripe Data**: Uses Arcade's built-in Stripe tools for live transaction data
- **PoSc Milestone Detection**: Automatically detects revenue growth, MRR milestones, and transaction volume spikes
- **Ambient Operation**: Runs continuously in the background without manual intervention
- **Human-in-the-Loop**: Generates approval requests for funding releases
- **Secure**: Uses Arcade's secrets management for Stripe API keys

## 🛠️ Setup

### Prerequisites

- Node.js 18+ or Bun
- Arcade account with API access
- Stripe account with API access

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   # or
   bun install
   ```

2. **Set up Arcade Secrets:**
   Follow the setup guide in [QUICK_SETUP.md](./QUICK_SETUP.md):
   - Add your Stripe secret key to Arcade dashboard
   - Configure your Arcade API key

3. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   ARCADE_API_KEY=your_arcade_api_key_here
   ```

## 🏃‍♂️ Running the Agent

### Quick Start
```bash
# Using Bun (recommended)
bun run index.ts

# Using Node.js
npx tsx index.ts
```

### What the Agent Does

1. **Fetches Real Stripe Data**: Uses Arcade's built-in Stripe tools to pull actual payment intents and customer data
2. **Calculates Real Metrics**: Computes MRR, growth rates, and transaction volumes from live data
3. **Evaluates Real Milestones**: Checks against PoSc criteria using actual Stripe metrics
4. **Generates Real Reports**: Creates comprehensive analysis with real funding recommendations
5. **Requests Real Approval**: Simulates Vault Inbox approval workflow based on actual data

## 📊 PoSc Milestone Criteria

The agent monitors for these key milestones:

- **Revenue Growth**: 20%+ month-over-month growth
- **MRR Milestone**: Reaching $25K+ MRR
- **Transaction Volume**: 100+ transactions with 10%+ growth
- **Customer Growth**: Significant new customer acquisition

## 🏗️ Architecture

```
Stripe Data → Arcade Tools → PoSc Analysis → Milestone Detection → Approval Request
     ↓              ↓              ↓              ↓                ↓
Transactions → Built-in Tools → Revenue Metrics → Event Trigger → Vault Inbox
```

### Key Components:
- **Arcade Tools**: Built-in Stripe integration with secure secret management
- **TypeScript Client**: Executes tools and processes responses
- **PoSc Analysis**: Calculate metrics and detect milestones
- **Human-in-the-Loop**: Vault Inbox for approval workflow

## 🎯 Use Cases

### Revenue Growth Detection
- Monitors real Stripe transactions for sustained revenue increases
- Triggers funding when 20%+ MoM growth is detected
- Provides detailed rationale and funding recommendations

### MRR Milestone Achievement
- Tracks Monthly Recurring Revenue progression from live data
- Automatically flags when $25K+ MRR is reached
- Suggests milestone-based funding releases

### High Transaction Volume
- Identifies periods of high customer activity
- Correlates transaction volume with growth rates
- Recommends scaling capital for customer acquisition

## 🔒 Security & Trust

- **Human-in-the-Loop**: All funding decisions require human approval
- **Audit Trail**: Complete logging of all decisions and rationale
- **Secure API**: Uses Arcade's secure Stripe integration
- **Data Privacy**: Only processes PoSc-relevant metrics

## 🚧 Project Structure

```
├── index.ts              # Main entry point
├── posc_sentinel.ts      # Core agent implementation
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── README.md            # This file
├── QUICK_SETUP.md       # Setup instructions
└── .env                 # Environment variables (create this)
```

## 📈 Example Output

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
✅ Retrieved 45 transactions
👥 Fetching Stripe customers via Arcade...
✅ Retrieved 150 customers
📊 Calculating PoSc metrics from real Stripe data...
📈 PoSc Metrics calculated:
  Current MRR: $32,450
  Previous MRR: $25,800
  Growth Rate: 25.8%
  Transactions: 45
  Customers: 150

📋 POSC SENTINEL REPORT (Real Stripe Data)
==================================================
🚀 POSC EVENT DETECTED!
Type: revenue_growth
Timestamp: 2024-01-15T10:30:00.000Z
Rationale: Revenue growth of 25.8% MoM detected. Current MRR: $32,450. This represents sustained traction and validates product-market fit.
Funding Recommendation: $19,470

📬 VAULT INBOX APPROVAL REQUEST:
Subject: PoSc Milestone - REVENUE GROWTH
Action Required: Approve $19,470 funding release
Reasoning: Revenue growth of 25.8% MoM detected. Current MRR: $32,450. This represents sustained traction and validates product-market fit.
Status: Pending Human Approval

💰 Stripe Balance:
Available: $500.00
Pending: $150.00

==================================================
🤖 PoSc monitoring cycle complete
```

## 🤝 Contributing

This is a hackathon project demonstrating ambient AI agents for enterprise use cases. Feel free to extend and improve the implementation!

## 📄 License

MIT License - see LICENSE file for details.
