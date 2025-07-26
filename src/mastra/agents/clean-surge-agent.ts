import { Agent } from "@mastra/core/agent";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import pg from "pg";
import mysql from "mysql2/promise";

// Tool schemas
const analyzeUserGrowthSchema = z.object({
  dbType: z.enum(["postgres", "mysql"]),
  connectionString: z.string(),
  tableName: z.string().optional(),
  daysToAnalyze: z.number().default(7)
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

// Clean tool implementation - only analyzes and returns data
const analyzeUserGrowth = {
  name: "analyzeUserGrowth",
  description: "Analyze user growth metrics from database",
  parameters: analyzeUserGrowthSchema,
  execute: async ({ 
    dbType, 
    connectionString, 
    tableName, 
    daysToAnalyze = 7
  }: z.infer<typeof analyzeUserGrowthSchema>) => {
    const db = await createDbConnection(dbType, connectionString);
    
    try {
      // Discover table if not provided
      let userTable = tableName;
      if (!userTable) {
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
      
      // Identify date column
      let dateColumn = "created_at";
      
      if (dbType === "postgres") {
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
        
        // Query for user growth
        const query = `
          WITH daily_signups AS (
            SELECT 
              DATE(${dateColumn}) as signup_date,
              COUNT(*) as daily_count
            FROM ${userTable}
            WHERE ${dateColumn} >= CURRENT_DATE - INTERVAL '${daysToAnalyze} days'
            GROUP BY DATE(${dateColumn})
            ORDER BY signup_date
          ),
          previous_period AS (
            SELECT COUNT(*) as count
            FROM ${userTable}
            WHERE ${dateColumn} >= CURRENT_DATE - INTERVAL '${daysToAnalyze * 2} days'
            AND ${dateColumn} < CURRENT_DATE - INTERVAL '${daysToAnalyze} days'
          ),
          current_period AS (
            SELECT COUNT(*) as count
            FROM ${userTable}
            WHERE ${dateColumn} >= CURRENT_DATE - INTERVAL '${daysToAnalyze} days'
          )
          SELECT 
            (SELECT count FROM current_period) as recent_signups,
            (SELECT count FROM previous_period) as previous_signups,
            (SELECT json_agg(json_build_object('date', signup_date, 'count', daily_count) ORDER BY signup_date) FROM daily_signups) as daily_breakdown,
            CURRENT_DATE - INTERVAL '${daysToAnalyze} days' as start_date,
            CURRENT_DATE as end_date
        `;
        
        const result = await (db as pg.Client).query(query);
        const data = result.rows[0];
        
        const newUsers = parseInt(data.recent_signups) || 0;
        const previousPeriodUsers = parseInt(data.previous_signups) || 0;
        const growthRate = previousPeriodUsers > 0 
          ? ((newUsers - previousPeriodUsers) / previousPeriodUsers * 100)
          : 0;
        const growthMultiplier = previousPeriodUsers > 0 
          ? newUsers / previousPeriodUsers 
          : 0;
        
        return {
          newUsers,
          previousPeriodUsers,
          growthRate,
          growthMultiplier,
          surge: growthMultiplier > 1.5,
          startDate: data.start_date.toISOString(),
          endDate: data.end_date.toISOString(),
          dailyBreakdown: data.daily_breakdown || [],
          dataSource: {
            dbType,
            tableName: userTable,
            dateColumn
          }
        };
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
        
        // Query for user growth
        const [[metrics]] = await (db as mysql.Connection).query(`
          SELECT 
            (SELECT COUNT(*) FROM ${userTable} WHERE ${dateColumn} >= DATE_SUB(CURDATE(), INTERVAL ${daysToAnalyze} DAY)) as recent_signups,
            (SELECT COUNT(*) FROM ${userTable} WHERE ${dateColumn} >= DATE_SUB(CURDATE(), INTERVAL ${daysToAnalyze * 2} DAY) AND ${dateColumn} < DATE_SUB(CURDATE(), INTERVAL ${daysToAnalyze} DAY)) as previous_signups,
            DATE_SUB(CURDATE(), INTERVAL ${daysToAnalyze} DAY) as start_date,
            CURDATE() as end_date
        `) as any;
        
        // Get daily breakdown
        const [dailyData] = await (db as mysql.Connection).query(`
          SELECT 
            DATE(${dateColumn}) as signup_date,
            COUNT(*) as daily_count
          FROM ${userTable}
          WHERE ${dateColumn} >= DATE_SUB(CURDATE(), INTERVAL ${daysToAnalyze} DAY)
          GROUP BY DATE(${dateColumn})
          ORDER BY signup_date
        `) as any;
        
        const newUsers = metrics.recent_signups || 0;
        const previousPeriodUsers = metrics.previous_signups || 0;
        const growthRate = previousPeriodUsers > 0 
          ? ((newUsers - previousPeriodUsers) / previousPeriodUsers * 100)
          : 0;
        const growthMultiplier = previousPeriodUsers > 0 
          ? newUsers / previousPeriodUsers 
          : 0;
        
        return {
          newUsers,
          previousPeriodUsers,
          growthRate,
          growthMultiplier,
          surge: growthMultiplier > 1.5,
          startDate: new Date(metrics.start_date).toISOString(),
          endDate: new Date(metrics.end_date).toISOString(),
          dailyBreakdown: dailyData.map((row: any) => ({
            date: new Date(row.signup_date).toISOString(),
            count: row.daily_count
          })),
          dataSource: {
            dbType,
            tableName: userTable,
            dateColumn
          }
        };
      }
    } finally {
      if (dbType === "postgres") {
        await (db as pg.Client).end();
      } else {
        await (db as mysql.Connection).end();
      }
    }
  }
};

// Create the Clean User Surge Agent
export const cleanSurgeAgent = new Agent({
  name: "Clean User Surge Agent",
  instructions: `You are a focused data analyst agent that retrieves and analyzes user growth metrics.

Your single responsibility:
- Connect to startup databases securely
- Analyze user growth over specified periods
- Return clean, structured metrics data

You do NOT:
- Store data in any database
- Make decisions about triggers or alerts
- Evaluate historical trends
- Send notifications

Focus on:
- Accurate data retrieval
- Proper date handling
- Growth rate calculations
- Surge detection (>50% growth)

Always return raw metrics for downstream processing.`,
  
  model: anthropic("claude-3-5-sonnet-latest"),
  tools: {
    analyzeUserGrowth
  }
});