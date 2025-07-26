import { MongoClient, Db, Collection } from "mongodb";
import { GrowthMetric, PoScTriggerEvaluation } from "../types/growth-metrics";

export class MongoDBService {
  private client: MongoClient;
  private db: Db;
  private growthMetricsCollection: Collection<GrowthMetric>;
  private triggerEvaluationsCollection: Collection<PoScTriggerEvaluation>;

  constructor(connectionString: string, dbName: string = "posc_metrics") {
    this.client = new MongoClient(connectionString);
    this.db = this.client.db(dbName);
    this.growthMetricsCollection = this.db.collection<GrowthMetric>("growth_metrics");
    this.triggerEvaluationsCollection = this.db.collection<PoScTriggerEvaluation>("trigger_evaluations");
  }

  async connect(): Promise<void> {
    await this.client.connect();
    
    // Create indexes for efficient queries
    await this.growthMetricsCollection.createIndex({ startupId: 1, period: -1 });
    await this.growthMetricsCollection.createIndex({ startupId: 1, metricType: 1, period: -1 });
    await this.triggerEvaluationsCollection.createIndex({ startupId: 1, evaluationDate: -1 });
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  // Save growth metrics
  async saveGrowthMetric(metric: Omit<GrowthMetric, "createdAt" | "updatedAt">): Promise<void> {
    const now = new Date();
    await this.growthMetricsCollection.insertOne({
      ...metric,
      createdAt: now,
      updatedAt: now
    } as GrowthMetric);
  }

  // Get latest growth metrics for a startup
  async getLatestGrowthMetrics(
    startupId: string, 
    metricType?: "weekly" | "monthly",
    limit: number = 10
  ): Promise<GrowthMetric[]> {
    const query: any = { startupId };
    if (metricType) {
      query.metricType = metricType;
    }

    return await this.growthMetricsCollection
      .find(query)
      .sort({ period: -1 })
      .limit(limit)
      .toArray();
  }

  // Get growth metrics for a specific period
  async getGrowthMetricsForPeriod(
    startupId: string,
    period: string,
    metricType: "weekly" | "monthly"
  ): Promise<GrowthMetric | null> {
    return await this.growthMetricsCollection.findOne({
      startupId,
      period,
      metricType
    });
  }

  // Calculate monthly growth trends
  async calculateMonthlyGrowthTrend(startupId: string, months: number = 6): Promise<number[]> {
    const metrics = await this.growthMetricsCollection
      .find({
        startupId,
        metricType: "monthly"
      })
      .sort({ period: -1 })
      .limit(months)
      .toArray();

    return metrics.map(m => m.metrics.growthRate).reverse();
  }

  // Save PoSc trigger evaluation
  async savePoScTriggerEvaluation(evaluation: Omit<PoScTriggerEvaluation, "createdAt">): Promise<void> {
    await this.triggerEvaluationsCollection.insertOne({
      ...evaluation,
      createdAt: new Date()
    } as PoScTriggerEvaluation);
  }

  // Get latest trigger evaluation
  async getLatestTriggerEvaluation(startupId: string): Promise<PoScTriggerEvaluation | null> {
    return await this.triggerEvaluationsCollection
      .findOne({ startupId })
      .sort({ evaluationDate: -1 });
  }

  // Count surges in a period
  async countSurgesInPeriod(startupId: string, days: number = 90): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const surges = await this.growthMetricsCollection.countDocuments({
      startupId,
      "metrics.surge": true,
      createdAt: { $gte: startDate }
    });

    return surges;
  }

  // Get aggregated monthly stats
  async getMonthlyStats(startupId: string): Promise<{
    totalUsers: number;
    avgMonthlyGrowth: number;
    surgeMonths: number;
  }> {
    const monthlyMetrics = await this.growthMetricsCollection
      .find({
        startupId,
        metricType: "monthly"
      })
      .sort({ period: -1 })
      .limit(12)
      .toArray();

    if (monthlyMetrics.length === 0) {
      return { totalUsers: 0, avgMonthlyGrowth: 0, surgeMonths: 0 };
    }

    const latestMetric = monthlyMetrics[0];
    const totalUsers = latestMetric.metrics.newUsers + latestMetric.metrics.previousPeriodUsers;
    const avgMonthlyGrowth = monthlyMetrics.reduce((sum, m) => sum + m.metrics.growthRate, 0) / monthlyMetrics.length;
    const surgeMonths = monthlyMetrics.filter(m => m.metrics.surge).length;

    return { totalUsers, avgMonthlyGrowth, surgeMonths };
  }
}