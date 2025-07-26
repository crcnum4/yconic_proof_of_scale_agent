import { Agent } from "@mastra/core/agent";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import pg from "pg";
import mysql from "mysql2/promise";
import { MongoDBService } from "../../services/mongodb-service";
import { type GrowthMetric } from "../../types/growth-metrics";

// Enhanced tool schemas
const analyzeUserGrowthWithStorageSchema = z.object({
  startupId: z.string(),
  dbType: z.enum(["postgres", "mysql"]),
  connectionString: z.string(),
  mongoConnectionString: z.string(),
  tableName: z.string().optional(),
  daysToAnalyze: z.number().default(7),
  analysisType: z.enum(["weekly", "monthly"]).default("weekly")
});

const evaluatePoScTriggerSchema = z.object({
  startupId: z.string(),
  mongoConnectionString: z.string(),
  monthsToEvaluate: z.number().default(3)
});

const getHistoricalGrowthSchema = z.object({
  startupId: z.string(),
  mongoConnectionString: z.string(),
  metricType: z.enum(["weekly", "monthly"]).optional(),
  limit: z.number().default(10)
});

// Database connection helper
async function createDbConnection(dbType: "postgres" | "mysql", connectionString: string) {
  if (dbType === "postgres") {
    const client = new pg.Client(connectionString);
    await client.connect();
    return client;
  } else {
    const connection = await mysql.createConnection(connectionString);
    return connection;
  }
}

// Helper to get week/month period string
function getPeriodString(date: Date, type: "weekly" | "monthly"): string {
  if (type === "weekly") {
    const year = date.getFullYear();
    const week = Math.ceil((date.getDate() + new Date(year, date.getMonth(), 1).getDay()) / 7);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  } else {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  }
}

// Enhanced tool implementations
const analyzeUserGrowthWithStorage = {
  name: "analyzeUserGrowthWithStorage",
  description: "Analyze user growth and store results in MongoDB",
  parameters: analyzeUserGrowthWithStorageSchema,
  execute: async ({ 
    startupId, 
    dbType, 
    connectionString, 
    mongoConnectionString,
    tableName, 
    daysToAnalyze = 7,
    analysisType = "weekly"
  }: z.infer<typeof analyzeUserGrowthWithStorageSchema>) => {
    const db = await createDbConnection(dbType, connectionString);
    const mongoService = new MongoDBService(mongoConnectionString);
    
    try {
      await mongoService.connect();
      
      // Discover table if not provided
      let userTable = tableName;
      if (!userTable) {
        // Reuse logic from original discoverTables
        let tables: string[] = [];
        
        if (dbType === "postgres") {
          const result = await (db as pg.Client).query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
          `);
          tables = result.rows.map(row => row.table_name);
        } else {
          const [rows] = await (db as mysql.Connection).query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
          `) as any;
          tables = rows.map((row: any) => row.TABLE_NAME || row.table_name);
        }
        
        const userTableCandidates = tables.filter(table => 
          table.toLowerCase().includes('user') || 
          table.toLowerCase().includes('account') ||
          table.toLowerCase().includes('member') ||
          table.toLowerCase().includes('customer')
        );
        
        userTable = userTableCandidates[0];
        if (!userTable) {
          throw new Error("Could not identify users table. Please provide the table name explicitly.");
        }
      }
      
      // Get date column
      let dateColumn = "created_at";
      
      // Adjust days for monthly analysis
      const adjustedDays = analysisType === "monthly" ? 30 : daysToAnalyze;
      
      // Execute growth analysis query
      let newUsers: number;
      let previousPeriodUsers: number;
      let dailyBreakdown: Array<{ date: Date; count: number }> = [];
      
      if (dbType === "postgres") {
        // Get columns to find date field
        const columnsResult = await (db as pg.Client).query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1
        `, [userTable]);
        
        const columns = columnsResult.rows.map(row => row.column_name);
        const dateColumns = columns.filter(col => 
          col.includes('created') || 
          col.includes('signup') || 
          col.includes('registered') ||
          col.includes('joined')
        );
        if (dateColumns.length > 0) {
          dateColumn = dateColumns[0];
        }
        
        const query = `
          WITH daily_signups AS (
            SELECT 
              DATE(${dateColumn}) as signup_date,
              COUNT(*) as daily_count
            FROM ${userTable}
            WHERE ${dateColumn} >= CURRENT_DATE - INTERVAL '${adjustedDays} days'
            GROUP BY DATE(${dateColumn})
            ORDER BY signup_date
          ),
          previous_period AS (
            SELECT COUNT(*) as count
            FROM ${userTable}
            WHERE ${dateColumn} >= CURRENT_DATE - INTERVAL '${adjustedDays * 2} days'
            AND ${dateColumn} < CURRENT_DATE - INTERVAL '${adjustedDays} days'
          )
          SELECT 
            (SELECT COALESCE(SUM(daily_count), 0) FROM daily_signups) as recent_signups,
            (SELECT count FROM previous_period) as previous_signups,
            (SELECT json_agg(json_build_object('date', signup_date, 'count', daily_count) ORDER BY signup_date) FROM daily_signups) as daily_breakdown
        `;
        
        const result = await (db as pg.Client).query(query);
        const data = result.rows[0];
        
        newUsers = parseInt(data.recent_signups) || 0;
        previousPeriodUsers = parseInt(data.previous_signups) || 0;
        dailyBreakdown = data.daily_breakdown || [];
      } else {
        // MySQL implementation
        const [columns] = await (db as mysql.Connection).query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE()
        `, [userTable]) as any;
        
        const columnNames = columns.map((col: any) => col.COLUMN_NAME);
        const dateColumns = columnNames.filter((col: string) => 
          col.includes('created') || 
          col.includes('signup') || 
          col.includes('registered') ||
          col.includes('joined')
        );
        if (dateColumns.length > 0) {
          dateColumn = dateColumns[0];
        }
        
        const query = `
          SELECT 
            (SELECT COUNT(*) FROM ${userTable} WHERE ${dateColumn} >= DATE_SUB(CURDATE(), INTERVAL ${adjustedDays} DAY)) as recent_signups,
            (SELECT COUNT(*) FROM ${userTable} WHERE ${dateColumn} >= DATE_SUB(CURDATE(), INTERVAL ${adjustedDays * 2} DAY) AND ${dateColumn} < DATE_SUB(CURDATE(), INTERVAL ${adjustedDays} DAY)) as previous_signups
        `;
        
        const [result] = await (db as mysql.Connection).query(query) as any;
        const data = result[0];
        
        newUsers = data.recent_signups || 0;
        previousPeriodUsers = data.previous_signups || 0;
        
        // Get daily breakdown
        const [dailyData] = await (db as mysql.Connection).query(`
          SELECT 
            DATE(${dateColumn}) as signup_date,
            COUNT(*) as daily_count
          FROM ${userTable}
          WHERE ${dateColumn} >= DATE_SUB(CURDATE(), INTERVAL ${adjustedDays} DAY)
          GROUP BY DATE(${dateColumn})
          ORDER BY signup_date
        `) as any;
        
        dailyBreakdown = dailyData.map((row: any) => ({
          date: new Date(row.signup_date),
          count: row.daily_count
        }));
      }
      
      // Calculate growth metrics
      const growthRate = previousPeriodUsers > 0 
        ? ((newUsers - previousPeriodUsers) / previousPeriodUsers * 100)
        : 0;
      
      const growthMultiplier = previousPeriodUsers > 0 
        ? newUsers / previousPeriodUsers 
        : 0;
      
      const surge = growthMultiplier > 1.5;
      
      // Prepare metric for storage
      const now = new Date();
      const metric: Omit<GrowthMetric, "createdAt" | "updatedAt"> = {
        startupId,
        metricType: analysisType,
        period: getPeriodString(now, analysisType),
        startDate: new Date(now.getTime() - adjustedDays * 24 * 60 * 60 * 1000),
        endDate: now,
        metrics: {
          newUsers,
          previousPeriodUsers,
          growthRate,
          growthMultiplier,
          surge,
          dailyBreakdown: analysisType === "weekly" ? dailyBreakdown : undefined
        },
        dataSource: {
          dbType,
          tableName: userTable,
          dateColumn
        }
      };
      
      // Save to MongoDB
      await mongoService.saveGrowthMetric(metric);
      
      return {
        startupId,
        period: metric.period,
        analysisType,
        newUsers,
        previousPeriodUsers,
        growthRate: `${growthRate.toFixed(2)}%`,
        growthMultiplier: growthMultiplier.toFixed(2),
        surge,
        tableName: userTable,
        dateColumn,
        dailyBreakdown: analysisType === "weekly" ? dailyBreakdown : undefined,
        saved: true,
        message: `Growth data for ${analysisType} period saved successfully`
      };
      
    } finally {
      if (dbType === "postgres") {
        await (db as pg.Client).end();
      } else {
        await (db as mysql.Connection).end();
      }
      await mongoService.disconnect();
    }
  }
};

const evaluatePoScTrigger = {
  name: "evaluatePoScTrigger",
  description: "Evaluate if PoSc funding trigger conditions are met based on historical growth data",
  parameters: evaluatePoScTriggerSchema,
  execute: async ({ 
    startupId, 
    mongoConnectionString,
    monthsToEvaluate = 3
  }: z.infer<typeof evaluatePoScTriggerSchema>) => {
    const mongoService = new MongoDBService(mongoConnectionString);
    
    try {
      await mongoService.connect();
      
      // Get monthly metrics
      const monthlyMetrics = await mongoService.getLatestGrowthMetrics(
        startupId, 
        "monthly", 
        monthsToEvaluate
      );
      
      if (monthlyMetrics.length === 0) {
        return {
          startupId,
          triggerRecommendation: "no_action",
          reasoning: "No monthly growth data available for evaluation",
          metrics: null
        };
      }
      
      // Calculate average monthly growth
      const monthlyGrowthRates = monthlyMetrics.map(m => m.metrics.growthRate);
      const avgMonthlyGrowth = monthlyGrowthRates.reduce((sum, rate) => sum + rate, 0) / monthlyGrowthRates.length;
      
      // Count surges
      const surgeCount = await mongoService.countSurgesInPeriod(startupId, 90);
      
      // Get latest metrics
      const latestMetric = monthlyMetrics[0];
      const currentMonthUsers = latestMetric.metrics.newUsers;
      const lastMonthUsers = latestMetric.metrics.previousPeriodUsers;
      
      // Determine if growth is sustained
      const sustainedGrowth = monthlyGrowthRates.filter(rate => rate > 20).length >= 2;
      
      // Evaluate trigger conditions
      let triggerRecommendation: "trigger" | "monitor" | "no_action";
      let reasoning: string;
      
      if (avgMonthlyGrowth > 30 && sustainedGrowth && surgeCount >= 2) {
        triggerRecommendation = "trigger";
        reasoning = `Strong sustained growth detected: ${avgMonthlyGrowth.toFixed(1)}% average monthly growth over ${monthsToEvaluate} months with ${surgeCount} surge events. Recommend triggering PoSc funding milestone.`;
      } else if (avgMonthlyGrowth > 20 || surgeCount >= 1) {
        triggerRecommendation = "monitor";
        reasoning = `Positive growth trends observed: ${avgMonthlyGrowth.toFixed(1)}% average monthly growth with ${surgeCount} surge events. Continue monitoring for sustained pattern.`;
      } else {
        triggerRecommendation = "no_action";
        reasoning = `Growth below threshold: ${avgMonthlyGrowth.toFixed(1)}% average monthly growth. No significant surge events detected.`;
      }
      
      // Save evaluation
      await mongoService.savePoScTriggerEvaluation({
        startupId,
        evaluationDate: new Date(),
        monthlyGrowthRate: avgMonthlyGrowth,
        sustainedGrowth,
        triggerRecommendation,
        reasoning,
        metrics: {
          lastMonthUsers,
          currentMonthUsers,
          monthlyGrowthTrend: monthlyGrowthRates,
          surgeCount
        }
      });
      
      return {
        startupId,
        triggerRecommendation,
        reasoning,
        metrics: {
          avgMonthlyGrowth: `${avgMonthlyGrowth.toFixed(2)}%`,
          monthsEvaluated: monthlyMetrics.length,
          sustainedGrowth,
          surgeCount,
          currentMonthUsers,
          monthlyTrend: monthlyGrowthRates.map(rate => `${rate.toFixed(1)}%`)
        }
      };
      
    } finally {
      await mongoService.disconnect();
    }
  }
};

const getHistoricalGrowth = {
  name: "getHistoricalGrowth",
  description: "Retrieve historical growth data for a startup",
  parameters: getHistoricalGrowthSchema,
  execute: async ({ 
    startupId, 
    mongoConnectionString,
    metricType,
    limit = 10
  }: z.infer<typeof getHistoricalGrowthSchema>) => {
    const mongoService = new MongoDBService(mongoConnectionString);
    
    try {
      await mongoService.connect();
      
      const metrics = await mongoService.getLatestGrowthMetrics(
        startupId,
        metricType,
        limit
      );
      
      const stats = await mongoService.getMonthlyStats(startupId);
      
      return {
        startupId,
        totalRecords: metrics.length,
        stats,
        metrics: metrics.map(m => ({
          period: m.period,
          type: m.metricType,
          newUsers: m.metrics.newUsers,
          growthRate: `${m.metrics.growthRate.toFixed(2)}%`,
          surge: m.metrics.surge,
          recordedAt: m.createdAt
        }))
      };
      
    } finally {
      await mongoService.disconnect();
    }
  }
};

// Create the Enhanced User Surge Detection Agent
export const enhancedSurgeAgent = new Agent({
  name: "Enhanced User Surge Detection Agent",
  instructions: `You are an advanced data analyst agent for the PoSc (Proof of Scale) monitoring system. You analyze user growth patterns, store metrics, and evaluate funding trigger conditions.

Your enhanced capabilities:
1. Analyze user growth for both weekly and monthly periods
2. Store all metrics in MongoDB for historical tracking
3. Evaluate PoSc funding triggers based on sustained growth patterns
4. Provide comprehensive growth analysis with trend detection
5. Track surge events and growth momentum

Analysis workflow:
- Accept startup ID and database credentials from Orkes workflow
- Analyze growth metrics (weekly or monthly)
- Store results in MongoDB with proper period tracking
- Evaluate if PoSc funding triggers should be activated
- Provide detailed recommendations based on growth patterns

Trigger evaluation criteria:
- Sustained growth >30% monthly average over 3 months
- Multiple surge events (>50% growth periods)
- Consistent upward trajectory
- No significant volatility or drops

Always:
- Store metrics with accurate period strings (YYYY-WW for weekly, YYYY-MM for monthly)
- Calculate both growth rate percentages and multipliers
- Flag surge events when growth exceeds 50%
- Provide clear reasoning for trigger recommendations
- Maintain data security and connection hygiene`,
  
  model: anthropic("claude-3-5-sonnet-latest"),
  tools: {
    analyzeUserGrowthWithStorage,
    evaluatePoScTrigger,
    getHistoricalGrowth
  }
});