import { MongoClient } from "mongodb";

// Use hardcoded connection string for MongoDB Atlas
const uri = 'mongodb+srv://ycadmin:mh4FqcQ13kABJ7DH@yc0n1cposc.6jhv3gn.mongodb.net/yconic_posc_agent?retryWrites=true&w=majority&appName=yc0n1cPoSC';

export const client = new MongoClient(uri, {
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
});
