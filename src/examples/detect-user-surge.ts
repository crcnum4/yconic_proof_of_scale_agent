import { userSurgeAgent } from "../mastra";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Example function to detect user surge
async function detectUserSurge() {
  try {
    console.log("🔍 Starting User Surge Detection...\n");

    // Example 1: Let the agent discover the users table
    const response1 = await userSurgeAgent.text({
      messages: [{
        role: "user",
        content: `Analyze user growth for the following database:
        - Database Type: postgres
        - Connection String: ${process.env.POSTGRES_CONNECTION_STRING || "postgresql://user:password@localhost:5432/startup_db"}
        
        Please discover the appropriate users table and analyze the growth over the last 7 days.`
      }]
    });

    console.log("Agent Response (Auto-discovery):");
    console.log(response1);
    console.log("\n" + "=".repeat(50) + "\n");

    // Example 2: Specify the table name directly
    const response2 = await userSurgeAgent.text({
      messages: [{
        role: "user",
        content: `Analyze user growth for the following database:
        - Database Type: mysql
        - Connection String: ${process.env.MYSQL_CONNECTION_STRING || "mysql://user:password@localhost:3306/startup_db"}
        - Table Name: users
        - Days to Analyze: 14
        
        Please provide a detailed analysis of user acquisition over the specified period.`
      }]
    });

    console.log("Agent Response (Specific table):");
    console.log(response2);

  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the example
detectUserSurge();