import { Agent } from "@mastra/core/agent";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import pg from "pg";
import mysql from "mysql2/promise";

// Tool schemas
const analyzeUserGrowthSchema = z.object({
  dbType: z.enum(["postgres", "mysql"]),
  connectionString: z.string(),
  tableName: z.string().optional().describe("The table name to query. If not provided, will attempt to discover the appropriate users table"),
  daysToAnalyze: z.number().default(7).describe("Number of days to analyze for user growth"),
});

const discoverTablesSchema = z.object({
  dbType: z.enum(["postgres", "mysql"]),
  connectionString: z.string(),
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

// Tool implementations
const discoverTables = {
  name: "discoverTables",
  description: "Discover available tables in the database and identify the users table",
  parameters: discoverTablesSchema,
  execute: async ({ dbType, connectionString }: z.infer<typeof discoverTablesSchema>) => {
    const db = await createDbConnection(dbType, connectionString);
    
    try {
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
      
      // Try to identify the users table
      const userTableCandidates = tables.filter(table => 
        table.toLowerCase().includes('user') || 
        table.toLowerCase().includes('account') ||
        table.toLowerCase().includes('member') ||
        table.toLowerCase().includes('customer')
      );
      
      return {
        allTables: tables,
        likelyUserTable: userTableCandidates[0] || null,
        userTableCandidates
      };
    } finally {
      if (dbType === "postgres") {
        await (db as pg.Client).end();
      } else {
        await (db as mysql.Connection).end();
      }
    }
  }
};

const analyzeUserGrowth = {
  name: "analyzeUserGrowth",
  description: "Analyze user growth over a specified period",
  parameters: analyzeUserGrowthSchema,
  execute: async ({ dbType, connectionString, tableName, daysToAnalyze = 7 }: z.infer<typeof analyzeUserGrowthSchema>) => {
    const db = await createDbConnection(dbType, connectionString);
    
    try {
      // If no table name provided, discover it
      let userTable = tableName || null;
      if (!userTable) {
        const tables = await discoverTables.execute({ dbType, connectionString });
        userTable = tables.likelyUserTable;
        if (!userTable) {
          throw new Error("Could not identify users table. Please provide the table name explicitly.");
        }
      }
      
      // Get table columns to identify date field
      let dateColumn = "created_at"; // default assumption
      
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
            ORDER BY signup_date DESC
          ),
          previous_period AS (
            SELECT COUNT(*) as count
            FROM ${userTable}
            WHERE ${dateColumn} >= CURRENT_DATE - INTERVAL '${daysToAnalyze * 2} days'
            AND ${dateColumn} < CURRENT_DATE - INTERVAL '${daysToAnalyze} days'
          )
          SELECT 
            (SELECT SUM(daily_count) FROM daily_signups) as recent_signups,
            (SELECT count FROM previous_period) as previous_signups,
            (SELECT json_agg(json_build_object('date', signup_date, 'count', daily_count) ORDER BY signup_date) FROM daily_signups) as daily_breakdown
        `;
        
        const result = await (db as pg.Client).query(query);
        const data = result.rows[0];
        
        const growthRate = data.previous_signups > 0 
          ? ((data.recent_signups - data.previous_signups) / data.previous_signups * 100).toFixed(2)
          : 'N/A';
        
        return {
          period: `Last ${daysToAnalyze} days`,
          newUsers: parseInt(data.recent_signups),
          previousPeriodUsers: parseInt(data.previous_signups),
          growthRate: `${growthRate}%`,
          dailyBreakdown: data.daily_breakdown,
          surge: parseInt(data.recent_signups) > parseInt(data.previous_signups) * 1.5,
          tableName: userTable,
          dateColumn: dateColumn
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
        const query = `
          SELECT 
            (SELECT COUNT(*) FROM ${userTable} WHERE ${dateColumn} >= DATE_SUB(CURDATE(), INTERVAL ${daysToAnalyze} DAY)) as recent_signups,
            (SELECT COUNT(*) FROM ${userTable} WHERE ${dateColumn} >= DATE_SUB(CURDATE(), INTERVAL ${daysToAnalyze * 2} DAY) AND ${dateColumn} < DATE_SUB(CURDATE(), INTERVAL ${daysToAnalyze} DAY)) as previous_signups
        `;
        
        const [result] = await (db as mysql.Connection).query(query) as any;
        const data = result[0];
        
        // Get daily breakdown
        const [dailyData] = await (db as mysql.Connection).query(`
          SELECT 
            DATE(${dateColumn}) as signup_date,
            COUNT(*) as daily_count
          FROM ${userTable}
          WHERE ${dateColumn} >= DATE_SUB(CURDATE(), INTERVAL ${daysToAnalyze} DAY)
          GROUP BY DATE(${dateColumn})
          ORDER BY signup_date DESC
        `) as any;
        
        const growthRate = data.previous_signups > 0 
          ? ((data.recent_signups - data.previous_signups) / data.previous_signups * 100).toFixed(2)
          : 'N/A';
        
        return {
          period: `Last ${daysToAnalyze} days`,
          newUsers: data.recent_signups,
          previousPeriodUsers: data.previous_signups,
          growthRate: `${growthRate}%`,
          dailyBreakdown: dailyData.map((row: any) => ({
            date: row.signup_date,
            count: row.daily_count
          })),
          surge: data.recent_signups > data.previous_signups * 1.5,
          tableName: userTable,
          dateColumn: dateColumn
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

// Create the User Surge Detection Agent
export const userSurgeAgent = new Agent({
  name: "User Surge Detection Agent",
  instructions: `You are a secure data analyst agent specialized in detecting user growth patterns and surges for the PoSc (Proof of Scale) monitoring system.

Your primary responsibilities:
1. Securely connect to startup databases to analyze user growth metrics
2. Identify the correct users table if not explicitly provided
3. Calculate user acquisition rates over specified periods (default: 7 days)
4. Detect surges in user signups (>50% growth compared to previous period)
5. Provide detailed breakdowns of daily user acquisition
6. Maintain security by never exposing sensitive user data, only aggregate metrics

When analyzing data:
- Always verify the table structure before querying
- Use appropriate date columns for accurate time-based analysis
- Calculate growth rates comparing current vs previous periods
- Flag significant surges that may trigger funding milestones
- Provide clear, actionable insights about user growth patterns

Security notes:
- Never return individual user records
- Only work with aggregate data and counts
- Ensure all database connections are properly closed
- Validate all inputs to prevent SQL injection`,
  
  model: anthropic("claude-3-5-sonnet-latest"),
  tools: {
    discoverTables,
    analyzeUserGrowth
  }
});