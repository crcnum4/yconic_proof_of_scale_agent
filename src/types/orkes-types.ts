import { z } from "zod";

// Input for connect_and_query_sql worker
export const ConnectQueryInputSchema = z.object({
  startupId: z.string(),
  dbCredentials: z.object({
    dbType: z.enum(["postgres", "mysql"]),
    connectionString: z.string(),
    tableName: z.string().optional()
  }),
  analysisType: z.enum(["weekly", "monthly"]).default("weekly"),
  daysToAnalyze: z.number().optional()
});

export type ConnectQueryInput = z.infer<typeof ConnectQueryInputSchema>;

// Output from connect_and_query_sql worker (raw metrics)
export const RawGrowthMetricsSchema = z.object({
  startupId: z.string(),
  period: z.string(),
  startDate: z.string(), // ISO string
  endDate: z.string(), // ISO string
  newUsers: z.number(),
  previousPeriodUsers: z.number(),
  growthRate: z.number(),
  growthMultiplier: z.number(),
  surge: z.boolean(),
  dailyBreakdown: z.array(z.object({
    date: z.string(), // ISO string
    count: z.number()
  })).optional(),
  dataSource: z.object({
    dbType: z.enum(["postgres", "mysql"]),
    tableName: z.string(),
    dateColumn: z.string()
  })
});

export type RawGrowthMetrics = z.infer<typeof RawGrowthMetricsSchema>;

// Input for store_and_evaluate_metrics worker
export const StoreEvaluateInputSchema = z.object({
  metrics: RawGrowthMetricsSchema,
  mongoConnectionString: z.string(),
  evaluateTrigger: z.boolean().default(false)
});

export type StoreEvaluateInput = z.infer<typeof StoreEvaluateInputSchema>;

// Output from store_and_evaluate_metrics worker
export const StoreEvaluateOutputSchema = z.object({
  stored: z.boolean(),
  evaluation: z.object({
    hasAbnormalDrop: z.boolean(),
    hasSurge: z.boolean(),
    recommendation: z.enum(["trigger_funding", "alert_team", "monitor", "no_action"]),
    reasoning: z.string(),
    historicalContext: z.object({
      avgGrowthRate: z.number(),
      recentTrend: z.enum(["growing", "stable", "declining"]),
      consecutiveSurges: z.number()
    }).optional()
  }).optional()
});

export type StoreEvaluateOutput = z.infer<typeof StoreEvaluateOutputSchema>;