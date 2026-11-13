const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const mongoose = require('mongoose');
const env = require('../config/env');

console.log('Testing connection to:', env.MONGODB_URI);

async function test() {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000
    });
    console.log('SUCCESS! Connected to MongoDB Atlas. Host:', conn.connection.host);
    const collections = await conn.connection.db.listCollections().toArray();
    console.log('Collections count:', collections.length);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('ERROR connecting to Atlas:');
    console.error('Name:', err.name);
    console.error('Message:', err.message);
    if (err.reason) console.error('Reason:', JSON.stringify(err.reason, null, 2));
    process.exit(1);
  }
}

test();
