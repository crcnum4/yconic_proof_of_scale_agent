import { Mastra } from "@mastra/core/mastra";
import { userSurgeAgent } from "./agents/user-surge-agent";
import { enhancedSurgeAgent } from "./agents/enhanced-surge-agent";
import { cleanSurgeAgent } from "./agents/clean-surge-agent";

// Create and export the Mastra instance
export const mastra = new Mastra({
  agents: {
    userSurgeAgent,
    enhancedSurgeAgent,
    cleanSurgeAgent
  }
});

// Export the agents for direct access if needed
export { userSurgeAgent, enhancedSurgeAgent, cleanSurgeAgent };