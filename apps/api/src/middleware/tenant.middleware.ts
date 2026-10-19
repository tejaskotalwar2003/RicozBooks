import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      currentCompanyId?: mongoose.Types.ObjectId;
      currentEntityId?: mongoose.Types.ObjectId;
    }
  }
}

export function tenantContext(req: Request, _res: Response, next: NextFunction) {
  // Check headers, query, or user default
  const headerCompany = req.headers['x-company-id'] as string;
  const headerEntity = req.headers['x-entity-id'] as string;

  if (headerCompany && mongoose.Types.ObjectId.isValid(headerCompany)) {
    req.currentCompanyId = new mongoose.Types.ObjectId(headerCompany);
  } else if (req.user?.default_company_id) {
    req.currentCompanyId = req.user.default_company_id;
  }

  if (headerEntity && mongoose.Types.ObjectId.isValid(headerEntity)) {
    req.currentEntityId = new mongoose.Types.ObjectId(headerEntity);
  } else if (req.user?.default_entity_id) {
    req.currentEntityId = req.user.default_entity_id;
  }

  return next();
}
