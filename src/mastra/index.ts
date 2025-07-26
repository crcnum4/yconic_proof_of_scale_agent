import { Mastra } from "@mastra/core/mastra";
import { poscAnalystAgent } from "./agents/posc-analyst-agent";
import { stockAgent } from "./agents/stock-agent";

// Create and export the Mastra instance
export const mastra = new Mastra({
  agents: {
    stockAgent
  }
});

// Export the agent for direct access if needed
export { stockAgent };