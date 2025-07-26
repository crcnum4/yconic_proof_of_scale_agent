/*
 * To set up the project, install the dependencies, and run the application, follow these steps:
 *
 * 1. Install the Conductor JavaScript SDK:
 *    npm install @io-orkes/conductor-javascript
 *    or
 *    yarn add @io-orkes/conductor-javascript
 *
 * 2. Install ts-node if not already installed:
 *    npm install ts-node
 *    or
 *    yarn add ts-node
 *
 * 3. Run the TypeScript file directly with ts-node (replace yourFile.ts with your actual file name):
 *    npx ts-node yourFile.ts
 */

import {
  type ConductorWorker,
  orkesConductorClient,
  TaskManager,
} from "@io-orkes/conductor-javascript";
import { cleanSurgeAgent } from "../mastra/agents/clean-surge-agent";
import { ConnectQueryInput, ConnectQueryInputSchema, RawGrowthMetrics } from "../types/orkes-types";
import dotenv from "dotenv";

dotenv.config();

async function test() {
  const clientPromise = orkesConductorClient({
    keyId: "8on416c35165-6a64-11f0-a7fc-a652d19b1278", // optional
    keySecret: "Y9bvQ1ZvT3D1H2nRWXMMhLNnCdSzEmlSfgyoBxw9tSUcxgyd", // optional
    TOKEN: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtqbVlNWThEV2VOU1lKZmZSSjFXNSJ9.eyJnaXZlbl9uYW1lIjoiY2xpZmYiLCJmYW1pbHlfbmFtZSI6ImNob2luaWVyZSIsIm5pY2tuYW1lIjoiY2xpZmYiLCJuYW1lIjoiY2xpZmYgY2hvaW5pZXJlIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0kxRDZkOHhfMy02TUZkWktvb0xCMEcxaTg2ejdZckx3eGMxODNyODBBTkFURzJIMUU9czk2LWMiLCJ1cGRhdGVkX2F0IjoiMjAyNS0wNy0yNlQxODo0Nzo1NS42MjNaIiwiZW1haWwiOiJjbGlmZkBjYXJlZXJkZXZzLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczovL2F1dGgub3JrZXMuaW8vIiwiYXVkIjoiTXlISll1VHNxTkw4RGFMSUd3b3U2ZlNheHpGM1RGclciLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExNzgzOTYwNTk5OTcyODk1NDE2NiIsImlhdCI6MTc1MzU1NTY3NywiZXhwIjoxNzUzNTkxNjc3LCJzaWQiOiJkdHFyYTR3Ynd2c0RicTUta0I2R1BJaWozbjEyclFzcSIsIm5vbmNlIjoiVDBGcmJEaExjV1p6V2xSRGRrbG9SMFUyVm1ka1JVcDVSMDQ1ZmpoRlpXcHZkblIxWm05R1VGSlliQT09In0.RqR2Y5JLffukDPVJay7SX20UVCfGoBERhrJorlk6plCVeFmcX9kbT6J2WdttlMWlz5oBrlsC8md8fadwswtwWByLp2gTlWKSm058Oqywjh98U43ZRfvfP0ltaG656tjk3MaosvUOToIYhI7ZirEIdtah0Kkt0PboUG2kUrZesxX5V8blce2ULdy-72xM_pIYtiCZiFhPsioxDFMDpnR0mZ4H-Iv9gSb5tyCuNoMHROIM4e8UqKNFD42v8TZJ1yMgA_ed2aEl497EyzS3hSufOlUA33nJAo62HtS1ExoK3q8D8lPu1i9WQfpubMd4RKddhLnmUY5WWPdglhE_TcuuQw",
    serverUrl: "https://developer.orkescloud.com/api"
  });

  const client = await clientPromise;

  const connectAndQueryWorker: ConductorWorker = {
    taskDefName: "connect_and_query_sql",
    execute: async ({ inputData, taskId }) => {
      console.log(`[${taskId}] Starting connect_and_query_sql worker`);
      
      try {
        // Validate input
        const input = ConnectQueryInputSchema.parse(inputData);
        console.log(`[${taskId}] Processing startup: ${input.startupId}`);
        
        // Use the agent to analyze growth
        const analysisResult = await cleanSurgeAgent.generate([{
          role: "user",
          content: `Analyze user growth:
          - Database Type: ${input.dbCredentials.dbType}
          - Connection String: ${input.dbCredentials.connectionString}
          ${input.dbCredentials.tableName ? `- Table Name: ${input.dbCredentials.tableName}` : ''}
          - Days to Analyze: ${input.daysToAnalyze || (input.analysisType === "monthly" ? 30 : 7)}
          
          Please analyze the user growth and return the metrics.`
        }]);
        
        console.log(`[${taskId}] Agent response:`, analysisResult);
        
        // Parse the agent's response to extract metrics
        // The agent should return structured data we can parse
        const metrics = parseAgentResponse(analysisResult.text, input);
        
        console.log(`[${taskId}] Extracted metrics:`, metrics);
        
        return {
          outputData: {
            metrics,
            analysisComplete: true,
            timestamp: new Date().toISOString()
          },
          status: "COMPLETED",
        };
      } catch (error) {
        console.error(`[${taskId}] Error in connect_and_query_sql:`, error);
        
        return {
          outputData: {
            error: error instanceof Error ? error.message : "Unknown error",
            startupId: inputData.startupId,
            timestamp: new Date().toISOString()
          },
          status: "FAILED",
        };
      }
    },
  };

  // Helper function to parse agent response
  function parseAgentResponse(agentResponse: string, input: ConnectQueryInput): RawGrowthMetrics {
    // The agent should return structured data
    // This is a simple parser - in production you might want more robust parsing
    try {
      // Try to parse as JSON first (in case agent returns JSON)
      try {
        const jsonData = JSON.parse(agentResponse);
        if (jsonData.newUsers !== undefined) {
          const now = new Date();
          const daysToAnalyze = input.daysToAnalyze || (input.analysisType === "monthly" ? 30 : 7);
          
          const newUsers = jsonData.newUsers || 0;
          const previousPeriodUsers = jsonData.previousPeriodUsers || 0;
          const growthRate = jsonData.growthRate || 0;
          const growthMultiplier = previousPeriodUsers > 0 ? newUsers / previousPeriodUsers : 0;
          
          return {
            startupId: input.startupId,
            period: input.analysisType === "monthly" 
              ? `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
              : `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7).toString().padStart(2, '0')}`,
            startDate: jsonData.startDate || new Date(now.getTime() - daysToAnalyze * 24 * 60 * 60 * 1000).toISOString(),
            endDate: jsonData.endDate || now.toISOString(),
            newUsers,
            previousPeriodUsers,
            growthRate,
            growthMultiplier,
            surge: jsonData.surge || growthMultiplier > 1.5,
            dailyBreakdown: jsonData.dailyBreakdown,
            dataSource: jsonData.dataSource || {
              dbType: input.dbCredentials.dbType,
              tableName: "users",
              dateColumn: "created_at"
            }
          };
        }
      } catch (e) {
        // Not JSON, continue with text parsing
      }
      
      // Fallback to text parsing
      const metricsMatch = agentResponse.match(/newUsers[:\s]+(\d+)/i);
      const previousMatch = agentResponse.match(/previousPeriodUsers[:\s]+(\d+)/i);
      const growthRateMatch = agentResponse.match(/growthRate[:\s]+([\d.-]+)/i);
      const surgeMatch = agentResponse.match(/surge[:\s]+(true|false)/i);
      const tableMatch = agentResponse.match(/tableName[:\s]+(\w+)/i);
      const dateColumnMatch = agentResponse.match(/dateColumn[:\s]+(\w+)/i);
      
      const now = new Date();
      const daysToAnalyze = input.daysToAnalyze || (input.analysisType === "monthly" ? 30 : 7);
      
      const newUsers = parseInt(metricsMatch?.[1] || "0");
      const previousPeriodUsers = parseInt(previousMatch?.[1] || "0");
      const growthRate = parseFloat(growthRateMatch?.[1] || "0");
      const growthMultiplier = previousPeriodUsers > 0 ? newUsers / previousPeriodUsers : 0;
      
      return {
        startupId: input.startupId,
        period: input.analysisType === "monthly" 
          ? `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
          : `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7).toString().padStart(2, '0')}`,
        startDate: new Date(now.getTime() - daysToAnalyze * 24 * 60 * 60 * 1000).toISOString(),
        endDate: now.toISOString(),
        newUsers,
        previousPeriodUsers,
        growthRate,
        growthMultiplier,
        surge: surgeMatch?.[1] === "true" || growthMultiplier > 1.5,
        dataSource: {
          dbType: input.dbCredentials.dbType,
          tableName: tableMatch?.[1] || "users",
          dateColumn: dateColumnMatch?.[1] || "created_at"
        }
      };
    } catch (error) {
      console.error("Error parsing agent response:", error);
      throw new Error("Failed to parse agent response");
    }
  }

  const manager = new TaskManager(client, [connectAndQueryWorker], {
    options: { pollInterval: 100, concurrency: 1 },
  });

  manager.startPolling();
}
test();