import { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.middleware.js';
import { prisma } from '../config/database.js';
import { getClientIP } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

/**
 * Audit logging middleware
 * Automatically logs CREATE, UPDATE, DELETE operations
 */
export function auditLog(entity: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Only log mutation operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    const originalJson = res.json.bind(res);
    
    res.json = function (body: any) {
      // Log after response is sent
      if (res.statusCode >= 200 && res.statusCode < 300 && req.userId) {
        const action = req.method === 'POST' ? 'CREATE' 
          : req.method === 'DELETE' ? 'DELETE' 
          : 'UPDATE';

        const entityId = req.params.id || body?.data?.id;

        prisma.auditLog
          .create({
            data: {
              userId: req.userId,
              action,
              entity,
              entityId: entityId || null,
              changes: {
                method: req.method,
                path: req.path,
                body: req.method !== 'DELETE' ? req.body : undefined,
              },
              ipAddress: getClientIP(req),
            },
          })
          .catch((err) => {
            logger.error('Failed to create audit log:', err.message);
          });
      }

      return originalJson(body);
    };

    next();
  };
}
