import { query } from '../config/db.js';
import { logger } from './logger.js';

export async function createAuditLog(
  userId: number | null | undefined,
  action: string,
  entityType: string,
  entityId: string | number | null | undefined,
  details: Record<string, any> = {},
  ipAddress?: string
) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId || null,
        action,
        entityType,
        entityId ? entityId.toString() : null,
        JSON.stringify(details),
        ipAddress || null,
      ]
    );
  } catch (error) {
    logger.warn('Không thể ghi audit log:', error);
  }
}
