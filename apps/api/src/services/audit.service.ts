import { Request } from 'express';
import { AuditLog } from '../models/AuditLog';
import { sanitizeAuditDetails } from '../utils/sanitize';

export interface LogEventParams {
  userId?: any;
  userEmail?: string;
  action: string;
  recordType: string;
  recordId?: string;
  companyId?: any;
  entityId?: any;
  details?: any;
  req?: Request;
}

export class AuditService {
  static async logEvent(params: LogEventParams): Promise<void> {
    try {
      let ipAddress = params.req?.ip || params.req?.headers['x-forwarded-for'] as string || undefined;
      let userAgent = params.req?.headers['user-agent'] as string || undefined;

      const sanitizedDetails = sanitizeAuditDetails(params.details);
      const detailsStr = typeof sanitizedDetails === 'object' ? JSON.stringify(sanitizedDetails) : sanitizedDetails;

      await AuditLog.create({
        user_id: params.userId || params.req?.user?._id || null,
        user_email: params.userEmail || params.req?.user?.email || null,
        action: params.action,
        record_type: params.recordType,
        record_id: params.recordId ? String(params.recordId) : undefined,
        company_id: params.companyId || params.req?.currentCompanyId || null,
        entity_id: params.entityId || params.req?.currentEntityId || null,
        details: detailsStr,
        ip_address: ipAddress,
        user_agent: userAgent,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('[AUDIT LOG ERROR] Failed to record audit event:', err);
    }
  }
}

