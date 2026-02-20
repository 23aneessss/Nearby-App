import { db } from "../db/client.js";
import { auditLogs } from "../db/schema.js";

export async function createAuditLog(
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, unknown> = {}
): Promise<void> {
    await db.insert(auditLogs).values({
        actorUserId,
        action,
        entityType,
        entityId,
        metadata,
    });
}
