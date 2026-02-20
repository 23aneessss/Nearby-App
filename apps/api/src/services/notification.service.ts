import { db } from "../db/client.js";
import { notifications } from "../db/schema.js";

export async function createNotification(
    userId: string,
    type: string,
    title: string,
    body: string
): Promise<void> {
    await db.insert(notifications).values({ userId, type, title, body });
    // Stub: in production, dispatch push notification here
    console.log(`[Notification] → ${userId}: ${title}`);
}

export async function createBulkNotifications(
    items: Array<{ userId: string; type: string; title: string; body: string }>
): Promise<void> {
    if (items.length === 0) return;
    await db.insert(notifications).values(items);
}
