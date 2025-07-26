// Test MongoDB Atlas connection
import { MongoClient } from 'mongodb';

async function testMongoDBConnection() {
  console.log("🧪 Testing MongoDB Atlas Connection");
  console.log("=".repeat(50));
  
  // Use the same hardcoded connection string as in mongodb_service.ts
  const uri = 'mongodb+srv://ycadmin:mh4FqcQ13kABJ7DH@yc0n1cposc.6jhv3gn.mongodb.net/yconic_posc_agent?retryWrites=true&w=majority&appName=yc0n1cPoSC';
  const database = 'yc0n1c_posc_agent';
  
  console.log("🔍 Using URI:", uri.substring(0, 50) + "...");
  console.log("🔍 Using database:", database);

  // Test URI format
  console.log("\n🔍 Testing URI format...");
  console.log("URI starts with mongodb+srv://:", uri.startsWith('mongodb+srv://'));
  console.log("URI starts with mongodb://:", uri.startsWith('mongodb://'));
  
  if (!uri.startsWith('mongodb+srv://') && !uri.startsWith('mongodb://')) {
    console.error("❌ Invalid URI format");
    return;
  }

  // Create MongoDB client with connection options
  const connectionOptions = {
    retryWrites: true,
    w: 'majority' as any,
    appName: 'yc0n1cPoSC',
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 1,
    maxIdleTimeMS: 30000,
    ssl: true,
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false
  };
  
  try {
    console.log("\n🧪 Running connection test...");
    
    // Create client
    const client = new MongoClient(uri, connectionOptions);
    
    console.log("🔄 Attempting to connect...");
    await client.connect();
    
    console.log("✅ MongoDB Atlas connection established");
    const db = client.db(database);
    
    // Test the connection
    await db.admin().ping();
    console.log("✅ MongoDB Atlas ping successful");
    
    console.log(`📊 Database: ${database}`);
    console.log(`📁 Collections: posc_snapshots, posc_events, startup_profiles`);
    
    // Close the connection
    await client.close();
    console.log("✅ Test connection closed");
    
    console.log("\n✅ MongoDB Atlas connection test PASSED");
    console.log("💡 Your connection string is working correctly");
    
  } catch (error) {
    console.error("\n❌ MongoDB Atlas connection test FAILED:");
    console.error("🔍 Error type:", (error as any).constructor.name);
    console.error("🔍 Error message:", (error as Error).message);
    
    // Provide specific guidance based on error type
    if ((error as Error).message.includes('ECONNREFUSED')) {
      console.error("💡 Possible solutions:");
      console.error("   - Check if MongoDB Atlas cluster is running");
      console.error("   - Verify network access (IP whitelist)");
      console.error("   - Check firewall settings");
    } else if ((error as Error).message.includes('ENOTFOUND')) {
      console.error("💡 Possible solutions:");
      console.error("   - Check DNS resolution");
      console.error("   - Verify connection string format");
    } else if ((error as Error).message.includes('Authentication failed')) {
      console.error("💡 Possible solutions:");
      console.error("   - Check username/password in connection string");
      console.error("   - Verify database user permissions");
    }
  }
}

// Run the test
testMongoDBConnection().catch(console.error); 