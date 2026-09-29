/**
 * MongoDB Connection
 * 
 * Connects to MongoDB using Mongoose with proper error handling
 * and connection event logging.
 */

const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

const connectDB = async () => {
  const primaryUri = env.mongodbUri;
  const localFallbackUri = 'mongodb://127.0.0.1:27017/hms';

  try {
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 4000,
    });
    logger.info(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    attachEventHandlers();
    return conn;
  } catch (primaryErr) {
    if (primaryUri !== localFallbackUri) {
      logger.warn(`⚠️ Primary MongoDB connection failed (${primaryErr.message}). Attempting local fallback: ${localFallbackUri}`);
      try {
        const fallbackConn = await mongoose.connect(localFallbackUri, {
          serverSelectionTimeoutMS: 4000,
        });
        logger.info(`✅ Connected to local MongoDB fallback: ${fallbackConn.connection.host}/${fallbackConn.connection.name}`);
        attachEventHandlers();
        return fallbackConn;
      } catch (fallbackErr) {
        logger.error('❌ Both primary and local MongoDB connections failed:', fallbackErr.message);
        process.exit(1);
      }
    } else {
      logger.error('❌ MongoDB connection failed:', primaryErr.message);
      process.exit(1);
    }
  }
};

const attachEventHandlers = () => {
  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
};

module.exports = connectDB;
