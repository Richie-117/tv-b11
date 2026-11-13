import { getSupabaseAdmin } from './supabase';
import { AdminTokenPayload } from './auth';

export interface AuditLogEntry {
  admin: AdminTokenPayload;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Records a sensitive administrative action into the audit log.
 * Never throws an unhandled error to prevent blocking core operations.
 */
export async function recordAdminAuditLog(entry: AuditLogEntry): Promise<void> {
  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    // Local / console audit log fallback
    console.log(`[AUDIT] [${new Date().toISOString()}] Admin ${entry.admin.username} (${entry.admin.role}): ${entry.action} on ${entry.targetType}${entry.targetId ? `:${entry.targetId}` : ''}`);
    return;
  }

  try {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await adminClient.from('admin_audit_logs').insert({
      id,
      admin_id: entry.admin.userId,
      admin_name: entry.admin.name,
      admin_role: entry.admin.role,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId || null,
      details: entry.details || {},
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
    });
  } catch (err) {
    console.error('Failed to write audit log to database:', err);
  }
}
