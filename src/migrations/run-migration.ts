import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log("🚀 Running MySQL migration...\n");
  
  const connectionString = "mysql://root:roottest@localhost:3306/";
  
  try {
    // Connect without specifying database (in case it doesn't exist)
    const connection = await mysql.createConnection(connectionString);
    
    console.log("✅ Connected to MySQL server");
    
    // Read migration file
    const migrationPath = join(__dirname, "001_create_users_table.sql");
    const migrationSQL = readFileSync(migrationPath, "utf8");
    
    // Split by delimiter to handle stored procedure
    const statements = migrationSQL
      .split(/(?:DELIMITER\s+\$\$)|(?:\$\$\s*DELIMITER\s*;)/g)
      .filter(stmt => stmt.trim())
      .map(stmt => stmt.trim());
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.length > 0 && !statement.match(/^\s*$/)) {
        try {
          console.log(`📝 Executing: ${statement.substring(0, 50)}...`);
          await connection.query(statement);
        } catch (err: any) {
          // Handle specific errors
          if (err.code === 'ER_EMPTY_QUERY') {
            continue;
          }
          console.error(`❌ Error executing statement: ${err.message}`);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
        }
      }
    }
    
    // Verify the data
    await connection.query("USE poscanalyst");
    
    const [totalUsers] = await connection.query(
      "SELECT COUNT(*) as count FROM users"
    ) as any;
    
    const [last7Days] = await connection.query(
      "SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
    ) as any;
    
    const [previous7Days] = await connection.query(
      "SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)"
    ) as any;
    
    const growthRate = ((last7Days[0].count - previous7Days[0].count) / previous7Days[0].count * 100).toFixed(2);
    
    console.log("\n📊 Migration Summary:");
    console.log(`✅ Database 'poscanalyst' created`);
    console.log(`✅ Table 'users' created with ${totalUsers[0].count} records`);
    console.log(`📈 Last 7 days: ${last7Days[0].count} new users`);
    console.log(`📈 Previous 7 days: ${previous7Days[0].count} new users`);
    console.log(`🚀 Growth rate: ${growthRate}% (This should trigger a surge alert!)`);
    
    // Show daily breakdown
    const [dailyBreakdown] = await connection.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as signups
      FROM users 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 14
    `) as any;
    
    console.log("\n📅 Daily Signups (Last 14 days):");
    dailyBreakdown.forEach((day: any) => {
      console.log(`   ${day.date.toISOString().split('T')[0]}: ${day.signups} users`);
    });
    
    await connection.end();
    console.log("\n✅ Migration completed successfully!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
runMigration();