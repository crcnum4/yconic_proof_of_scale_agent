# PoSc Mastra Agents

This directory contains Mastra-based AI agents for the Ambient PoSc Sentinel system.

## User Surge Detection Agent

The `user-surge-agent.ts` implements a secure agent that monitors user acquisition patterns for startups.

### Features

- **Secure Database Connection**: Supports both PostgreSQL and MySQL
- **Automatic Table Discovery**: Can identify the users table if not specified
- **Growth Analysis**: Calculates user growth over configurable time periods
- **Surge Detection**: Automatically flags significant growth (>50% increase)
- **Daily Breakdown**: Provides day-by-day user acquisition data

### Security Considerations

- Only works with aggregate data (counts, not individual records)
- Properly closes all database connections
- Validates inputs to prevent SQL injection
- Never exposes sensitive user information

### Tools

1. **discoverTables**: Finds available tables and identifies likely user tables
2. **analyzeUserGrowth**: Performs the actual growth analysis and surge detection

### Usage

```typescript
import { userSurgeAgent } from "../mastra";

const response = await userSurgeAgent.text({
  messages: [{
    role: "user",
    content: "Analyze user growth for postgres://... over the last 7 days"
  }]
});
```

## Future Agents

- Revenue Monitoring Agent
- Feature Usage Agent
- Sentiment Analysis Agent
- Operational Excellence Agent