import { db } from "../db/client.js";
import {
    categories,
    users,
    providerProfiles,
    bookings,
    reviews,
    auditLogs,
    supportTickets,
} from "../db/schema.js";
import { eq, sql, count, and } from "drizzle-orm";
import { AppError } from "../middleware/error.js";
import { createAuditLog } from "./audit.service.js";
import { createNotification } from "./notification.service.js";
import { NotificationType } from "@nearby/shared";

// ─── Categories ──────────────────────────────────────────
export async function getCategories() {
    return db.select().from(categories).where(eq(categories.isActive, true));
}

export async function getAllCategories() {
    return db.select().from(categories);
}

export async function createCategory(name: string, icon: string) {
    const [cat] = await db.insert(categories).values({ name, icon }).returning();
    return cat;
}

export async function toggleCategory(categoryId: string) {
    const [cat] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);

    if (!cat) {
        throw new AppError(404, "NOT_FOUND", "Category not found");
    }

    const [updated] = await db
        .update(categories)
        .set({ isActive: !cat.isActive })
        .where(eq(categories.id, categoryId))
        .returning();

    return updated;
}

// ─── Admin Provider Management ───────────────────────────
export async function getAdminProviders(verified?: boolean) {
    if (verified !== undefined) {
        return db
            .select()
            .from(providerProfiles)
            .where(eq(providerProfiles.verified, verified));
    }
    return db.select().from(providerProfiles);
}

export async function verifyProvider(
    providerId: string,
    adminUserId: string
) {
    const [updated] = await db
        .update(providerProfiles)
        .set({ verified: true })
        .where(eq(providerProfiles.id, providerId))
        .returning();

    if (!updated) {
        throw new AppError(404, "NOT_FOUND", "Provider not found");
    }

    await createNotification(
        updated.userId,
        NotificationType.PROVIDER_VERIFIED,
        "Profile Verified",
        "Your provider profile has been verified! You can now receive bookings."
    );

    await createAuditLog(adminUserId, "PROVIDER_VERIFIED", "provider", providerId);

    return updated;
}

export async function blockProvider(
    providerId: string,
    adminUserId: string
) {
    const [profile] = await db
        .select()
        .from(providerProfiles)
        .where(eq(providerProfiles.id, providerId))
        .limit(1);

    if (!profile) {
        throw new AppError(404, "NOT_FOUND", "Provider not found");
    }

    await db
        .update(users)
        .set({ status: "BLOCKED" })
        .where(eq(users.id, profile.userId));

    await createNotification(
        profile.userId,
        NotificationType.PROVIDER_BLOCKED,
        "Account Blocked",
        "Your provider account has been blocked. Contact support for details."
    );

    await createAuditLog(adminUserId, "PROVIDER_BLOCKED", "provider", providerId);

    return { success: true };
}

// ─── Reviews Moderation ──────────────────────────────────
export async function getReviews() {
    return db.select().from(reviews);
}

export async function hideReview(reviewId: string, adminUserId: string) {
    const [updated] = await db
        .update(reviews)
        .set({ isHidden: true })
        .where(eq(reviews.id, reviewId))
        .returning();

    if (!updated) {
        throw new AppError(404, "NOT_FOUND", "Review not found");
    }

    await createAuditLog(adminUserId, "REVIEW_HIDDEN", "review", reviewId);
    return updated;
}

// ─── Stats ───────────────────────────────────────────────
export async function getAdminStats() {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [providerCount] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, "PROVIDER"));
    const [clientCount] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, "CLIENT"));
    const [bookingCount] = await db.select({ count: count() }).from(bookings);

    const statusCounts = await db
        .select({
            status: bookings.status,
            count: count(),
        })
        .from(bookings)
        .groupBy(bookings.status);

    const bookingsByStatus: Record<string, number> = {};
    for (const row of statusCounts) {
        bookingsByStatus[row.status] = row.count;
    }

    return {
        totalUsers: userCount?.count ?? 0,
        totalProviders: providerCount?.count ?? 0,
        totalClients: clientCount?.count ?? 0,
        totalBookings: bookingCount?.count ?? 0,
        bookingsByStatus,
        topCategories: [],
    };
}

// ─── Audit Logs ──────────────────────────────────────────
export async function getAuditLogs() {
    return db
        .select()
        .from(auditLogs)
        .orderBy(sql`${auditLogs.createdAt} DESC`)
        .limit(100);
}

// ─── Support Tickets ─────────────────────────────────────
export async function resolveTicket(
    ticketId: string,
    adminUserId: string
) {
    const [updated] = await db
        .update(supportTickets)
        .set({ status: "RESOLVED" })
        .where(eq(supportTickets.id, ticketId))
        .returning();

    if (!updated) {
        throw new AppError(404, "NOT_FOUND", "Ticket not found");
    }

    await createAuditLog(adminUserId, "TICKET_RESOLVED", "ticket", ticketId);
    return updated;
}
