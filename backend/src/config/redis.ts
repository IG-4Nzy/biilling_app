import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let redis: Redis;

try {
  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true,
  });

  redis.on('connect', () => {
    logger.info('✅ Redis connected successfully');
  });

  redis.on('error', (err) => {
    logger.error('Redis error:', err.message);
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });
} catch (error) {
  logger.error('❌ Redis initialization failed:', error);
  // Create a mock redis for development without Redis
  redis = new Redis({ lazyConnect: true });
}

export { redis };

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
  } catch (error) {
    logger.warn('⚠️ Redis connection failed, running without cache:', (error as Error).message);
  }
}
