import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function logAuditEvent(
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: Record<string, any>,
  userName: string = "کاربر سیستم"
) {
  try {
    await db.insert(auditLogs).values({
      action,
      entityType,
      entityId: entityId || null,
      userName,
      details: details || {},
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
