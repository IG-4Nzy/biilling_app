import { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.middleware.js';

/**
 * Role-Based Access Control Middleware
 * Checks if the authenticated user has one of the allowed roles
 */
export function authorize(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userId || !req.userRole) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.userRole)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        requiredRoles: allowedRoles,
      });
      return;
    }

    next();
  };
}

/**
 * Admin-only access shorthand
 */
export const adminOnly = authorize('ADMIN');

/**
 * Staff and Admin access shorthand
 */
export const staffOrAdmin = authorize('ADMIN', 'STAFF');

/**
 * Any authenticated user
 */
export const anyRole = authorize('ADMIN', 'STAFF', 'VIEWER');
