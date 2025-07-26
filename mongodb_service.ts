// MongoDB Service for yc0n1c's Ambient PoSc Sentinel
import { MongoClient, Db, Collection } from 'mongodb';
import type {
  PoScSnapshot,
  PoScEventLog,
  StartupProfile,
  MongoDBConfig,
  RevenueMetrics,
  StripeBalance,
  StripeTransaction,
  StripeCustomer,
  StripeInvoice,
  PoScEvent,
  PoScMilestone
} from './types.js';

export class MongoDBService {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  constructor() {
    // No config needed - uses hardcoded values
  }

  /**
   * Connect to MongoDB
   */
  async connect(): Promise<void> {
    try {
      console.log("🔌 Connecting to MongoDB Atlas...");
      
      // Hardcoded MongoDB Atlas connection string
      const uri = 'mongodb+srv://ycadmin:mh4FqcQ13kABJ7DH@yc0n1cposc.6jhv3gn.mongodb.net/yconic_posc_agent?retryWrites=true&w=majority&appName=yc0n1cPoSC';
      const database = 'yc0n1c_posc_agent';
      
      console.log("🔍 Using hardcoded MongoDB Atlas connection");
      console.log("🔍 Database:", database);
      
      // Parse connection options
      const connectionOptions = {
        retryWrites: true,
        w: 'majority' as any,
        appName: 'yc0n1cPoSC',
        serverSelectionTimeoutMS: 10000, // 10 second timeout
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 1,
        maxIdleTimeMS: 30000,
        // Atlas specific options
        ssl: true,
        tls: true,
        tlsAllowInvalidCertificates: false,
        tlsAllowInvalidHostnames: false
      };

      console.log("🔧 Connection options:", {
        serverSelectionTimeoutMS: connectionOptions.serverSelectionTimeoutMS,
        connectTimeoutMS: connectionOptions.connectTimeoutMS,
        maxPoolSize: connectionOptions.maxPoolSize,
        ssl: connectionOptions.ssl,
        tls: connectionOptions.tls
      });
      
      this.client = new MongoClient(uri, connectionOptions);

      console.log("🔄 Attempting to connect...");
      await this.client.connect();
      
      console.log("✅ MongoDB Atlas connection established");
      this.db = this.client.db(database);
      
      // Test the connection
      await this.db.admin().ping();
      console.log("✅ MongoDB Atlas ping successful");
      
      console.log(`📊 Database: ${database}`);
      console.log(`📁 Collections: posc_snapshots, posc_events, startup_profiles`);
      
    } catch (error) {
      console.error("❌ MongoDB Atlas connection failed:");
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
      
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
        console.log("✅ MongoDB disconnected successfully");
      }
    } catch (error) {
      console.error("❌ Error disconnecting from MongoDB:", error);
    }
  }

  /**
   * Get collection by name
   */
  private getCollection<T extends Document>(name: string): Collection<T> {
    if (!this.db) {
      throw new Error("MongoDB not connected");
    }
    return this.db.collection<T>(name);
  }

  /**
   * Store PoSc snapshot data
   */
  async storeSnapshot(snapshot: Omit<PoScSnapshot, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const collection = this.getCollection<PoScSnapshot>('posc_snapshots');
      
      const document: PoScSnapshot = {
        ...snapshot,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await collection.insertOne(document);
      console.log("✅ PoSc snapshot stored successfully");
      console.log(`📊 Document ID: ${result.insertedId}`);
      
      return result.insertedId.toString();
    } catch (error) {
      console.error("❌ Failed to store PoSc snapshot:", error);
      throw error;
    }
  }

  /**
   * Store PoSc event log
   */
  async storeEventLog(eventLog: Omit<PoScEventLog, '_id' | 'createdAt'>): Promise<string> {
    try {
      const collection = this.getCollection<PoScEventLog>('posc_events');
      
      const document: PoScEventLog = {
        ...eventLog,
        createdAt: new Date()
      };

      const result = await collection.insertOne(document);
      console.log("✅ PoSc event log stored successfully");
      console.log(`📊 Event ID: ${result.insertedId}`);
      
      return result.insertedId.toString();
    } catch (error) {
      console.error("❌ Failed to store PoSc event log:", error);
      throw error;
    }
  }

  /**
   * Upsert startup profile
   */
  async upsertStartupProfile(profile: Omit<StartupProfile, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const collection = this.getCollection<StartupProfile>('startup_profiles');
      
      const filter = { startupId: profile.startupId };
      const update = {
        $set: {
          ...profile,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      };

      const result = await collection.updateOne(filter, update, { upsert: true });
      
      if (result.upsertedId) {
        console.log("✅ Startup profile created successfully");
        return result.upsertedId.toString();
      } else {
        console.log("✅ Startup profile updated successfully");
        return profile.startupId;
      }
    } catch (error) {
      console.error("❌ Failed to upsert startup profile:", error);
      throw error;
    }
  }

  /**
   * Get latest snapshot for a startup
   */
  async getLatestSnapshot(startupId: string): Promise<PoScSnapshot | null> {
    try {
      const collection = this.getCollection<PoScSnapshot>('posc_snapshots');
      
      const snapshot = await collection
        .find({ startupId })
        .sort({ timestamp: -1 })
        .limit(1)
        .next();

      return snapshot;
    } catch (error) {
      console.error("❌ Failed to get latest snapshot:", error);
      return null;
    }
  }

  /**
   * Get startup profile
   */
  async getStartupProfile(startupId: string): Promise<StartupProfile | null> {
    try {
      const collection = this.getCollection<StartupProfile>('startup_profiles');
      
      const profile = await collection.findOne({ startupId });
      return profile;
    } catch (error) {
      console.error("❌ Failed to get startup profile:", error);
      return null;
    }
  }

  /**
   * Get recent events for a startup
   */
  async getRecentEvents(startupId: string, limit: number = 10): Promise<PoScEventLog[]> {
    try {
      const collection = this.getCollection<PoScEventLog>('posc_events');
      
      const events = await collection
        .find({ startupId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return events;
    } catch (error) {
      console.error("❌ Failed to get recent events:", error);
      return [];
    }
  }

  /**
   * Create database indexes
   */
  async createIndexes(): Promise<void> {
    try {
      console.log("🔧 Creating MongoDB indexes...");
      
      // Snapshots collection indexes
      const snapshotsCollection = this.getCollection<PoScSnapshot>('posc_snapshots');
      await snapshotsCollection.createIndex({ startupId: 1, timestamp: -1 });
      await snapshotsCollection.createIndex({ timestamp: -1 });
      
      // Events collection indexes
      const eventsCollection = this.getCollection<PoScEventLog>('posc_events');
      await eventsCollection.createIndex({ startupId: 1, timestamp: -1 });
      await eventsCollection.createIndex({ eventId: 1 });
      await eventsCollection.createIndex({ status: 1 });
      
      // Startups collection indexes
      const startupsCollection = this.getCollection<StartupProfile>('startup_profiles');
      await startupsCollection.createIndex({ startupId: 1 }, { unique: true });
      await startupsCollection.createIndex({ userId: 1 });
      
      console.log("✅ MongoDB indexes created successfully");
    } catch (error) {
      console.error("❌ Failed to create indexes:", error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) {
        return false;
      }
      
      await this.db.admin().ping();
      return true;
    } catch (error) {
      console.error("❌ MongoDB health check failed:", error);
      return false;
    }
  }

  /**
   * Test connection without storing data
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log("🧪 Testing MongoDB Atlas connection...");
      
      // Hardcoded MongoDB Atlas connection string
      const uri = 'mongodb+srv://ycadmin:mh4FqcQ13kABJ7DH@yc0n1cposc.6jhv3gn.mongodb.net/yconic_posc_agent?retryWrites=true&w=majority&appName=yc0n1cPoSC';
      const database = 'yc0n1c_posc_agent';
      
      console.log("🔍 Testing URI format...");
      if (!uri.startsWith('mongodb+srv://') && !uri.startsWith('mongodb://')) {
        console.error("❌ Invalid URI format");
        return false;
      }

      console.log("🔍 URI format looks good");
      console.log("🔍 Database name:", database);
      
      // Try to connect
      const testClient = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        ssl: true,
        tls: true
      });

      console.log("🔄 Attempting test connection...");
      await testClient.connect();
      
      console.log("✅ Test connection successful!");
      
      const testDb = testClient.db(database);
      await testDb.admin().ping();
      console.log("✅ Database ping successful!");
      
      await testClient.close();
      console.log("✅ Test connection closed");
      
      return true;
    } catch (error) {
      console.error("❌ Test connection failed:");
      console.error("🔍 Error:", (error as Error).message);
      return false;
    }
  }
}

// Export a singleton instance
export const mongoService = new MongoDBService(); 