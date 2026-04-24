import { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.middleware.js';
import { prisma } from '../config/database.js';

/**
 * All available privileges in the system.
 */
export const ALL_PRIVILEGES = [
  'create_bill',
  'view_bill',
  'edit_bill',
  'cancel_bill',
  'status_update',
  'add_products',
  'edit_products',
  'delete_products',
  'add_customers',
  'edit_customers',
  'view_reports',
  'manage_users',
] as const;

export type Privilege = (typeof ALL_PRIVILEGES)[number];

/**
 * Default privileges per role.
 * ADMIN always has all privileges (checked first).
 * These defaults apply when the user's privileges array is empty.
 */
export const DEFAULT_ROLE_PRIVILEGES: Record<string, Privilege[]> = {
  ADMIN: [...ALL_PRIVILEGES],
  STAFF: ['create_bill', 'view_bill', 'edit_bill', 'status_update', 'add_products', 'edit_products', 'add_customers', 'edit_customers'],
  VIEWER: ['view_bill', 'view_reports'],
};

/**
 * Middleware to check if user has one of the required privileges.
 * ADMIN role bypasses all checks.
 */
export function requirePrivilege(...required: Privilege[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId || !req.userRole) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    // ADMIN always has full access
    if (req.userRole === 'ADMIN') return next();

    // Get user privileges from DB
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { privileges: true, role: true },
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    const userPrivileges = (user.privileges as string[]) || [];
    // If user has no custom privileges, use role defaults
    const effectivePrivileges = userPrivileges.length > 0
      ? userPrivileges
      : DEFAULT_ROLE_PRIVILEGES[user.role] || [];

    const hasPermission = required.some(p => effectivePrivileges.includes(p));

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: 'You do not have permission to perform this action',
        required,
      });
      return;
    }

    next();
  };
}
