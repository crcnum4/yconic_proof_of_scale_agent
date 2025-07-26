import { enhancedSurgeAgent } from "../mastra";
import { StartupAnalysisRequest } from "../types/growth-metrics";
import dotenv from "dotenv";

dotenv.config();

/**
 * Orkes Workflow Task Handler for User Surge Analysis
 * 
 * This function is designed to be called by an Orkes workflow.
 * The workflow should pass startup credentials and analysis parameters.
 */
export async function userSurgeAnalysisTask(input: StartupAnalysisRequest) {
  try {
    console.log(`🚀 Starting analysis for startup: ${input.startupId}`);
    
    // Perform weekly analysis by default
    if (input.analysisType === "weekly" || input.analysisType === "both") {
      console.log("📊 Running weekly analysis...");
      
      const weeklyResult = await enhancedSurgeAgent.text({
        messages: [{
          role: "user",
          content: `Analyze weekly user growth for startup ${input.startupId}:
          - Database Type: ${input.dbCredentials.dbType}
          - Connection String: ${input.dbCredentials.connectionString}
          - MongoDB Storage: ${input.mongoConnectionString}
          ${input.dbCredentials.tableName ? `- Table Name: ${input.dbCredentials.tableName}` : ''}
          
          Please analyze the last 7 days of user growth and store the results.`
        }]
      });
      
      console.log("Weekly Analysis Complete:", weeklyResult);
    }
    
    // Perform monthly analysis if requested
    if (input.analysisType === "monthly" || input.analysisType === "both") {
      console.log("📈 Running monthly analysis...");
      
      const monthlyResult = await enhancedSurgeAgent.text({
        messages: [{
          role: "user",
          content: `Analyze monthly user growth for startup ${input.startupId}:
          - Database Type: ${input.dbCredentials.dbType}
          - Connection String: ${input.dbCredentials.connectionString}
          - MongoDB Storage: ${input.mongoConnectionString}
          ${input.dbCredentials.tableName ? `- Table Name: ${input.dbCredentials.tableName}` : ''}
          - Analysis Type: monthly
          
          Please analyze the last 30 days of user growth and store the results.`
        }]
      });
      
      console.log("Monthly Analysis Complete:", monthlyResult);
      
      // Evaluate PoSc trigger after monthly analysis
      console.log("🎯 Evaluating PoSc trigger conditions...");
      
      const triggerEvaluation = await enhancedSurgeAgent.text({
        messages: [{
          role: "user",
          content: `Evaluate PoSc funding trigger for startup ${input.startupId}:
          - MongoDB Connection: ${input.mongoConnectionString}
          - Months to Evaluate: 3
          
          Please analyze historical growth data and determine if funding triggers should be activated.`
        }]
      });
      
      console.log("PoSc Trigger Evaluation:", triggerEvaluation);
      
      // Return structured response for Orkes workflow
      return {
        status: "completed",
        startupId: input.startupId,
        analysisType: input.analysisType,
        monthlyAnalysisComplete: true,
        triggerEvaluation: triggerEvaluation,
        timestamp: new Date().toISOString()
      };
    }
    
    return {
      status: "completed",
      startupId: input.startupId,
      analysisType: input.analysisType,
      weeklyAnalysisComplete: true,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error("Error in user surge analysis task:", error);
    
    return {
      status: "failed",
      startupId: input.startupId,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Batch analysis function for multiple startups
 * Can be called by Orkes for scheduled batch processing
 */
export async function batchUserSurgeAnalysis(startups: StartupAnalysisRequest[]) {
  console.log(`🔄 Starting batch analysis for ${startups.length} startups`);
  
  const results = await Promise.allSettled(
    startups.map(startup => userSurgeAnalysisTask(startup))
  );
  
  const summary = {
    total: startups.length,
    successful: results.filter(r => r.status === "fulfilled").length,
    failed: results.filter(r => r.status === "rejected").length,
    results: results.map((result, index) => ({
      startupId: startups[index].startupId,
      status: result.status,
      result: result.status === "fulfilled" ? result.value : { error: result.reason }
    }))
  };
  
  console.log("Batch analysis complete:", summary);
  return summary;
}