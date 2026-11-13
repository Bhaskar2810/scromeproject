const dns = require('dns');
const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

// Ensure Node uses public reliable DNS resolvers for MongoDB Atlas SRV lookups on Windows
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (dnsErr) {
  logger.warn('Could not override DNS servers:', dnsErr.message);
}

let memoryServer = null;

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);
    
    // Attempt standard connection first
    logger.info(`Attempting MongoDB connection to ${env.MONGODB_URI}...`);
    try {
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 30000
      });
      logger.info('Connected to MongoDB successfully.');
      return mongoose.connection;
    } catch (primaryErr) {
      if (!env.USE_MEMORY_DB_FALLBACK) {
        throw primaryErr;
      }
      logger.warn(`Could not connect to external MongoDB: ${primaryErr.message}`);
      logger.info('Starting embedded in-memory MongoDB instance for zero-config local resilience...');
      
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      const memoryUri = memoryServer.getUri();
      
      await mongoose.connect(memoryUri);
      logger.info(`Connected to embedded MongoDB Memory Server at ${memoryUri}`);
      return mongoose.connection;
    }
  } catch (error) {
    logger.error('Failed to connect to any MongoDB instance:', error);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
    }
    logger.info('MongoDB disconnected.');
  } catch (error) {
    logger.error('Error disconnecting MongoDB:', error);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  getConnection: () => mongoose.connection
};
