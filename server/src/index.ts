import { app } from './app.js';
import { config } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

const server = app.listen(config.PORT, () => {
  logger.info(`🚀 DBS Global University API Server running on port ${config.PORT}`);
  logger.info(`📡 Environment: ${config.NODE_ENV} | API Prefix: ${config.API_PREFIX}`);
  logger.info(`🩺 Health check available at: http://localhost:${config.PORT}${config.API_PREFIX}/health`);
});

// Graceful termination handling
async function handleShutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await prisma.$disconnect();
      logger.info('Database connection pool disconnected.');
    } catch (err) {
      logger.error('Error during database disconnect:', err);
    }
    process.exit(0);
  });

  // Force exit after 10 seconds if hanging
  setTimeout(() => {
    logger.error('Forcefully terminating process after shutdown timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
