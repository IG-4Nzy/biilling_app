import { createServer } from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { setupSocket } from './config/socket.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const httpServer = createServer(app);

    // Setup WebSocket
    setupSocket(httpServer);

    // Start server
    httpServer.listen(env.PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════╗
║     ECMF Billing System v1.0.0               ║
║──────────────────────────────────────────────║
║  🚀 Server:    http://localhost:${env.PORT}        ║
║  📊 Health:    http://localhost:${env.PORT}/api/health ║
║  🔌 WebSocket: ws://localhost:${env.PORT}          ║
║  🌍 Env:       ${env.NODE_ENV.padEnd(28)}║
╚══════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);

      httpServer.close(async () => {
        await disconnectDatabase();
        logger.info('Server shut down successfully');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
