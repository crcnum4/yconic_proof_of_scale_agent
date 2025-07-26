import { z } from "zod";

// Schema for storing growth metrics in MongoDB
export const GrowthMetricSchema = z.object({
  startupId: z.string(),
  metricType: z.enum(["weekly", "monthly"]),
  period: z.string(), // e.g., "2025-W04" for week 4 of 2025, or "2025-01" for January 2025
  startDate: z.date(),
  endDate: z.date(),
  metrics: z.object({
    newUsers: z.number(),
    previousPeriodUsers: z.number(),
    growthRate: z.number(), // Percentage
    growthMultiplier: z.number(), // e.g., 1.5 for 50% growth
    surge: z.boolean(),
    dailyBreakdown: z.array(z.object({
      date: z.date(),
      count: z.number()
    })).optional()
  }),
  dataSource: z.object({
    dbType: z.enum(["postgres", "mysql"]),
    tableName: z.string(),
    dateColumn: z.string()
  }),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type GrowthMetric = z.infer<typeof GrowthMetricSchema>;

// Schema for PoSc trigger evaluation
export const PoScTriggerEvaluationSchema = z.object({
  startupId: z.string(),
  evaluationDate: z.date(),
  monthlyGrowthRate: z.number(),
  quarterlyGrowthRate: z.number().optional(),
  sustainedGrowth: z.boolean(), // True if growth is consistent over multiple periods
  triggerRecommendation: z.enum(["trigger", "monitor", "no_action"]),
  reasoning: z.string(),
  metrics: z.object({
    lastMonthUsers: z.number(),
    currentMonthUsers: z.number(),
    monthlyGrowthTrend: z.array(z.number()), // Array of monthly growth rates
    surgeCount: z.number() // Number of surges in the evaluation period
  }),
  createdAt: z.date()
});

export type PoScTriggerEvaluation = z.infer<typeof PoScTriggerEvaluationSchema>;

// Input schema for Orkes workflow
export const StartupAnalysisRequestSchema = z.object({
  startupId: z.string(),
  dbCredentials: z.object({
    dbType: z.enum(["postgres", "mysql"]),
    connectionString: z.string(),
    tableName: z.string().optional()
  }),
  analysisType: z.enum(["weekly", "monthly", "both"]),
  mongoConnectionString: z.string() // Where to store results
});

export type StartupAnalysisRequest = z.infer<typeof StartupAnalysisRequestSchema>;