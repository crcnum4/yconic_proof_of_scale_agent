const mongoose = require('mongoose');
require('dotenv').config();

async function testServerConnection() {
  try {
    console.log('🔍 Testing Server Database Connection...\n');
    
    // Use the same connection string as the server
    const mongoURI = process.env.MONGODB_URI;
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
      // Get all documents
      const allDocs = await poscResults.find({}).toArray();
      console.log('\n📄 All documents:');
      allDocs.forEach((doc, index) => {
        console.log(`Document ${index + 1}:`);
        console.log(`  startupId: ${doc.startupId}`);
        console.log(`  userId: ${doc.userId}`);
        console.log(`  currentMRR: ${doc.metrics?.currentMRR || 0}`);
        console.log('');
      });
      
      // Test the exact query the server uses
      console.log('🔍 Testing server query (no filter):');
      const serverQueryResults = await poscResults.find({}).toArray();
      console.log(`  Found ${serverQueryResults.length} documents`);
      
      // Test with startupId filter
      console.log('\n🔍 Testing server query with startupId filter:');
      const filteredResults = await poscResults.find({ startupId: 'yc0n1c_posc' }).toArray();
      console.log(`  Found ${filteredResults.length} documents with startupId: yc0n1c_posc`);
    }
    
    console.log('\n✅ Server connection test completed!');
    
  } catch (error) {
    console.error('❌ Server connection test error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the test
testServerConnection(); 