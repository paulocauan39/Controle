import { useAuditLogger, AuditLoggerEntry } from './useAuditLogger.js';

export type AdminAuditEntry = AuditLoggerEntry;

/**
 * Re-export useAuditLogger and backward-compatible alias useAdminAudit
 */
export { useAuditLogger };
export const useAdminAudit = useAuditLogger;
