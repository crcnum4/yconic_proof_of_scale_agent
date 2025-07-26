const mongoose = require('mongoose');
require('dotenv').config();

async function debugDatabase() {
  try {
    console.log('🔍 Debugging Database Connection...\n');
    
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/yconic_posc_agent';
    console.log('Connecting to:', mongoURI);
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB successfully!\n');
    
    const db = mongoose.connection.db;
    console.log('📊 Database name:', db.databaseName);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('📁 Available collections:', collections.map(c => c.name));
    
    // Check posc_results collection
    const poscResults = db.collection('posc_results');
    const totalDocuments = await poscResults.countDocuments();
    console.log(`\n📈 Total documents in posc_results: ${totalDocuments}`);
    
    if (totalDocuments > 0) {
      // Get a sample document to see structure
      const sampleDoc = await poscResults.findOne();
      console.log('\n📄 Sample document structure:');
      console.log(JSON.stringify(sampleDoc, null, 2));
      
      // Get all unique startupId values
      const uniqueStartupIds = await poscResults.distinct('startupId');
      console.log('\n🏢 Unique startupId values:');
      uniqueStartupIds.forEach((id, index) => {
        console.log(`  ${index + 1}. ${id}`);
      });
      
      // Count documents for each startupId
      console.log('\n📊 Document count by startupId:');
      for (const startupId of uniqueStartupIds) {
        const count = await poscResults.countDocuments({ startupId });
        console.log(`  ${startupId}: ${count} documents`);
      }
      
      // Test filtering by specific startupId values
      console.log('\n🔍 Testing filters:');
      
      // Test with "yc0n1c_posc"
      const yc0n1cCount = await poscResults.countDocuments({ startupId: 'yc0n1c_posc' });
      console.log(`  startupId: "yc0n1c_posc" -> ${yc0n1cCount} documents`);
      
      // Test with "yconic_posc"
      const yconicCount = await poscResults.countDocuments({ startupId: 'yconic_posc' });
      console.log(`  startupId: "yconic_posc" -> ${yconicCount} documents`);
      
      // Test with partial match
      const partialCount = await poscResults.countDocuments({ 
        startupId: { $regex: /yconic/i } 
      });
      console.log(`  startupId: /yconic/i (case-insensitive) -> ${partialCount} documents`);
    }
    
    console.log('\n✅ Database debugging completed!');
    
  } catch (error) {
    console.error('❌ Database debugging error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the debug function
debugDatabase(); 