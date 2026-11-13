const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const logger = require('./utils/logger');

let server;

const startServer = async () => {
  try {
    await connectDB();

    server = app.listen(env.PORT, () => {
      logger.info(`=======================================================`);
      logger.info(`RESILIENT DECISION SYSTEM (BACKEND) STARTED`);
      logger.info(`Server listening on port: ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`API Base URL: http://localhost:${env.PORT}/api`);
      logger.info(`Health Endpoint: http://localhost:${env.PORT}/api/health`);
      logger.info(`=======================================================`);
    });

    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Initiating graceful shutdown...`);
      if (server) {
        server.close(async () => {
          logger.info('HTTP server closed.');
          await disconnectDB();
          logger.info('Process terminated gracefully.');
          process.exit(0);
        });
      } else {
        await disconnectDB();
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
