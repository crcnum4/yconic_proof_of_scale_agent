import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const getStockPrice = async (symbol) => {
  const data = await fetch(
    `https://mastra-stock-data.vercel.app/api/stock-data?symbol=${symbol}`
  ).then((r) => r.json());
  return data.prices["4. close"];
};
const stockPrices = createTool({
  id: "Get Stock Price",
  inputSchema: z.object({
    symbol: z.string()
  }),
  description: `Fetches the last day's closing stock price for a given symbol`,
  execute: async ({ context: { symbol } }) => {
    console.log("Using tool to fetch stock price for", symbol);
    return {
      symbol,
      currentPrice: await getStockPrice(symbol)
    };
  }
});

export { stockPrices };
//# sourceMappingURL=f6eb8bc5-d43d-466b-b823-8b3f3d03f479.mjs.map
