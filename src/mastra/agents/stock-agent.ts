import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
 
import * as tools from "../tools/stockPrices";
 
export const stockAgent = new Agent({
  name: "Stock Agent",
  instructions:
    "You are a helpful assistant that provides current stock prices. When asked about a stock, use the stock price tool to fetch the stock price.",
  model: openai("gpt-4o-mini"),
  tools: {
    stockPrices: tools.stockPrices,
  },
});