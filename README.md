# yc0n1c PoSC Agent

A sophisticated sales revenue milestone monitoring system that detects sustained increases in sales volume and unlocks growth funding opportunities.

## 🎯 Use Case

**Specific Use Case Flow:**
- **Monitors Sales** – Revenue Milestone Trigger
- **Goal:** Detect a sustained increase in sales volume and unlock growth funding

## 🚀 Features

### Core Functionality
- **Real-time Sales Monitoring**: Track revenue milestones and growth patterns
- **Growth Rate Analysis**: Monitor new account growth rate per month
- **Sustained Growth Detection**: Identify consistent growth over multiple periods
- **Funding Eligibility Assessment**: Calculate funding recommendations based on performance
- **PoSC Agent Intelligence**: Automated analysis and response system

### Database Schema
- **Users Table**: Comprehensive user data with growth metrics
- **Monitoring Events**: Track all monitoring activities and triggers
- **Growth Analytics**: Aggregated analytics and funding scores

### Key Metrics Tracked
- New account growth rate per month
- Revenue growth patterns
- Sales volume trends
- Milestone achievements ($5K, $10K, $25K, $50K, $100K, $250K, $500K, $1M)
- Sustained growth periods
- Funding eligibility scores

## 🛠️ Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone and Install Dependencies**
```bash
git clone <repository-url>
cd yconic_proof_of_scale_agent
npm install
```

2. **Environment Setup**
```bash
cp env.example .env
# Edit .env with your MongoDB connection string
```

3. **Database Configuration**
```bash
# For local MongoDB
MONGODB_URI=mongodb://localhost:27017/yconic_posc_agent

# For MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/yconic_posc_agent
```

4. **Start the Server**
```bash
npm run dev  # Development mode with nodemon
# or
npm start    # Production mode
```

5. **Verify Installation**
```bash
curl http://localhost:3000/health
```

## 📊 Database Schema

### Users Collection
```javascript
{
  name: String,
  email: String,
  company: String,
  isActive: Boolean,
  monthlyGrowth: [{
    month: String,        // YYYY-MM format
    newAccounts: Number,
    growthRate: Number,
    revenue: Number,
    salesVolume: Number
  }],
  currentGrowthRate: Number,
  currentRevenue: Number,
  currentSalesVolume: Number,
  salesMilestones: [{
    milestone: String,    // $5K, $10K, $25K, etc.
    achievedAt: Date,
    revenue: Number
  }],
  monitoringEnabled: Boolean,
  salesMilestoneThreshold: Number,
  growthRateThreshold: Number
}
```

### Monitoring Events Collection
```javascript
{
  eventType: String,      // SALES_MILESTONE, GROWTH_THRESHOLD, etc.
  userId: ObjectId,
  eventData: Mixed,
  triggerValue: Number,
  thresholdValue: Number,
  isTriggered: Boolean,
  fundingEligible: Boolean,
  fundingAmount: Number,
  agentResponse: String,
  severity: String,       // LOW, MEDIUM, HIGH, CRITICAL
  priority: String        // LOW, MEDIUM, HIGH, URGENT
}
```

### Growth Analytics Collection
```javascript
{
  userId: ObjectId,
  newAccountGrowth: {
    currentMonth: Number,
    previousMonth: Number,
    growthRate: Number,
    trend: String         // INCREASING, DECREASING, STABLE
  },
  revenueGrowth: { /* same structure */ },
  salesVolumeGrowth: { /* same structure */ },
  sustainedGrowthPeriods: {
    count: Number,
    averageDuration: Number,
    longestPeriod: Number,
    currentStreak: Number
  },
  fundingEligibilityScore: Number,  // 0-100
  performanceScore: Number,          // 0-100
  agentInsights: [{
    insight: String,
    category: String,
    timestamp: Date,
    actionable: Boolean
  }]
}
```

## 🔌 API Endpoints

### Health Check
```http
GET /health
```

### Users Management
```http
GET    /api/v1/users                    # Get all users
GET    /api/v1/users/:id               # Get user by ID
POST   /api/v1/users                   # Create new user
PUT    /api/v1/users/:id               # Update user
DELETE /api/v1/users/:id               # Delete user
POST   /api/v1/users/:id/growth        # Add monthly growth data
GET    /api/v1/users/:id/growth        # Get user growth data
GET    /api/v1/users/:id/milestones    # Get user milestones
PUT    /api/v1/users/:id/monitoring    # Update monitoring thresholds
PUT    /api/v1/users/:id/monitoring/toggle  # Toggle monitoring
GET    /api/v1/users/:id/analytics     # Get user analytics
POST   /api/v1/users/:id/analytics/calculate  # Calculate analytics
```

### Monitoring
```http
GET    /api/v1/monitoring/events       # Get monitoring events
GET    /api/v1/monitoring/events/:id   # Get event by ID
GET    /api/v1/monitoring/dashboard    # Get dashboard data
GET    /api/v1/monitoring/status       # Get monitoring status
POST   /api/v1/monitoring/trigger/:userId  # Trigger monitoring for user
POST   /api/v1/monitoring/events/trigger    # Manually trigger event
GET    /api/v1/monitoring/alerts       # Get recent alerts
PUT    /api/v1/monitoring/events/:id/notify  # Mark event as notified
PUT    /api/v1/monitoring/events/:id/resolve # Resolve event
POST   /api/v1/monitoring/events/:id/action # Add agent action
GET    /api/v1/monitoring/stats        # Get event statistics
```

### Analytics
```http
GET    /api/v1/analytics               # Get overall analytics
GET    /api/v1/analytics/user/:userId  # Get user-specific analytics
GET    /api/v1/analytics/funding-eligible  # Get funding eligible users
GET    /api/v1/analytics/growth-trends # Get growth trends
GET    /api/v1/analytics/top-performers # Get top performers
POST   /api/v1/analytics/calculate/:userId  # Calculate analytics for user
GET    /api/v1/analytics/dashboard     # Get analytics dashboard
```

### PoSC Agent
```http
GET    /api/v1/posc-agent/status       # Get agent status
GET    /api/v1/posc-agent/responses    # Get agent responses
POST   /api/v1/posc-agent/analyze/:userId  # Analyze user for insights
POST   /api/v1/posc-agent/trigger/:userId   # Manually trigger agent
GET    /api/v1/posc-agent/funding-recommendations  # Get funding recommendations
POST   /api/v1/posc-agent/start       # Start monitoring service
POST   /api/v1/posc-agent/stop        # Stop monitoring service
GET    /api/v1/posc-agent/insights/:userId  # Get agent insights for user
POST   /api/v1/posc-agent/insights/:userId  # Add agent insight
GET    /api/v1/posc-agent/performance # Get agent performance metrics
```

## 📈 Example Usage

### 1. Create a User
```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Tech Startup Inc"
  }'
```

### 2. Add Growth Data
```bash
curl -X POST http://localhost:3000/api/v1/users/USER_ID/growth \
  -H "Content-Type: application/json" \
  -d '{
    "month": "2024-01",
    "newAccounts": 150,
    "growthRate": 0.25,
    "revenue": 25000,
    "salesVolume": 50000
  }'
```

### 3. Check Milestones
```bash
curl http://localhost:3000/api/v1/users/USER_ID/milestones
```

### 4. Trigger Agent Analysis
```bash
curl -X POST http://localhost:3000/api/v1/posc-agent/analyze/USER_ID
```

### 5. Get Funding Recommendations
```bash
curl http://localhost:3000/api/v1/posc-agent/funding-recommendations
```

## ⚙️ Configuration

### Environment Variables
```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/yconic_posc_agent
MONGODB_URI_PROD=mongodb+srv://username:password@cluster.mongodb.net/yconic_posc_agent

# Server Configuration
PORT=3000
NODE_ENV=development

# API Configuration
API_VERSION=v1
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring Configuration
SALES_MILESTONE_THRESHOLD=10000
GROWTH_RATE_THRESHOLD=0.15
MONITORING_INTERVAL_MS=300000
```

### Milestone Thresholds
- **$5K**: $5,000 revenue milestone
- **$10K**: $10,000 revenue milestone
- **$25K**: $25,000 revenue milestone
- **$50K**: $50,000 revenue milestone
- **$100K**: $100,000 revenue milestone
- **$250K**: $250,000 revenue milestone
- **$500K**: $500,000 revenue milestone
- **$1M**: $1,000,000 revenue milestone

### Growth Rate Thresholds
- **Default**: 15% growth rate threshold
- **Sustained Growth**: 5% minimum for 3+ consecutive months
- **Funding Eligibility**: 70% minimum score

## 🔧 Development

### Running Tests
```bash
npm test
```

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm start
```

## 🚀 Deployment

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Setup
1. Set up MongoDB Atlas cluster
2. Configure environment variables
3. Deploy to your preferred platform
4. Set up monitoring and logging

## 📊 Monitoring & Analytics

### Key Metrics
- **User Growth**: New account creation rates
- **Revenue Growth**: Monthly revenue increases
- **Sales Volume**: Total sales volume trends
- **Milestone Achievement**: Revenue milestone tracking
- **Funding Eligibility**: Automated funding recommendations

### Dashboard Features
- Real-time monitoring dashboard
- Growth trend analysis
- Top performer identification
- Funding eligibility scoring
- Agent response tracking

## 🤖 PoSC Agent Intelligence

The PoSC Agent provides:
- **Automated Analysis**: Continuous monitoring of user metrics
- **Intelligent Insights**: Data-driven recommendations
- **Funding Recommendations**: Automated funding eligibility assessment
- **Growth Pattern Recognition**: Sustained growth detection
- **Milestone Tracking**: Revenue milestone monitoring

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**yc0n1c PoSC Agent** - Empowering growth through intelligent sales monitoring and funding automation. 