import { Request, Response, NextFunction } from 'express';
import { Role } from '../models/Role';

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ detail: 'Authentication required' });
  }

  if (!req.user.is_superuser) {
    return res.status(403).json({ detail: 'Super Administrator privileges required for this operation' });
  }

  return next();
}

export function requirePermission(permissionCode: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ detail: 'Authentication required' });
    }

    // Super Admin possesses all permissions
    if (req.user.is_superuser) {
      return next();
    }

    try {
      const userRole = await Role.findOne({ name: req.user.role });
      if (!userRole) {
        return res.status(403).json({ detail: `Assigned role '${req.user.role}' does not exist` });
      }

      if (!userRole.permissions.includes(permissionCode)) {
        return res.status(403).json({
          detail: `Permission denied: Missing '${permissionCode}' capability`,
          required_permission: permissionCode,
        });
      }

      return next();
    } catch (err: any) {
      return res.status(500).json({ detail: `Authorization evaluation failed: ${err.message}` });
    }
  };
}
