/**
 * HMS Server Entry Point - Updated with Patient Portal
 * 
 * Connects to the database, then starts the Express server.
 * Configuration is dynamically reloaded from server/.env.
 */

const env = require('./src/config/env');
const connectDB = require('./src/config/db');
const app = require('./src/app');
const logger = require('./src/utils/logger');

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  // Start Express server
  app.listen(env.port, () => {
    logger.info(`🏥 HMS Server running on port ${env.port} [${env.nodeEnv}]`);
    logger.info(`   Health check: http://localhost:${env.port}/api/v1/health`);
  });
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();