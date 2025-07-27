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
import { runPoScSentinel } from "../../posc_sentinel";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function test() {
  const clientPromise = orkesConductorClient({
    keyId: "8on416c35165-6a64-11f0-a7fc-a652d19b1278", // optional
    keySecret: "Y9bvQ1ZvT3D1H2nRWXMMhLNnCdSzEmlSfgyoBxw9tSUcxgyd", // optional
    TOKEN: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtqbVlNWThEV2VOU1lKZmZSSjFXNSJ9.eyJnaXZlbl9uYW1lIjoiY2xpZmYiLCJmYW1pbHlfbmFtZSI6ImNob2luaWVyZSIsIm5pY2tuYW1lIjoiY2xpZmYiLCJuYW1lIjoiY2xpZmYgY2hvaW5pZXJlIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0kxRDZkOHhfMy02TUZkWktvb0xCMEcxaTg2ejdZckx3eGMxODNyODBBTkFURzJIMUU9czk2LWMiLCJ1cGRhdGVkX2F0IjoiMjAyNS0wNy0yNlQxODo0Nzo1NS42MjNaIiwiZW1haWwiOiJjbGlmZkBjYXJlZXJkZXZzLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczovL2F1dGgub3JrZXMuaW8vIiwiYXVkIjoiTXlISll1VHNxTkw4RGFMSUd3b3U2ZlNheHpGM1RGclciLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExNzgzOTYwNTk5OTcyODk1NDE2NiIsImlhdCI6MTc1MzU1NTY3NywiZXhwIjoxNzUzNTkxNjc3LCJzaWQiOiJkdHFyYTR3Ynd2c0RicTUta0I2R1BJaWozbjEyclFzcSIsIm5vbmNlIjoiVDBGcmJEaExjV1p6V2xSRGRrbG9SMFUyVm1ka1JVcDVSMDQ1ZmpoRlpXcHZkblIxWm05R1VGSlliQT09In0.RqR2Y5JLffukDPVJay7SX20UVCfGoBERhrJorlk6plCVeFmcX9kbT6J2WdttlMWlz5oBrlsC8md8fadwswtwWByLp2gTlWKSm058Oqywjh98U43ZRfvfP0ltaG656tjk3MaosvUOToIYhI7ZirEIdtah0Kkt0PboUG2kUrZesxX5V8blce2ULdy-72xM_pIYtiCZiFhPsioxDFMDpnR0mZ4H-Iv9gSb5tyCuNoMHROIM4e8UqKNFD42v8TZJ1yMgA_ed2aEl497EyzS3hSufOlUA33nJAo62HtS1ExoK3q8D8lPu1i9WQfpubMd4RKddhLnmUY5WWPdglhE_TcuuQw",
    serverUrl: "https://developer.orkescloud.com/api"
  });

  const client = await clientPromise;

  const customWorker: ConductorWorker = {
    taskDefName: "get_stripe_data",
    execute: async ({ inputData, taskId }) => {

      runPoScSentinel().catch(console.error); 
      return {
        status: "COMPLETED",
      };
    },
  };

  const manager = new TaskManager(client, [customWorker], {
    options: { pollInterval: 100, concurrency: 1 },
  });

  manager.startPolling();
}
test();