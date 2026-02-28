import { db } from "../db/client.js";
import {
    providerProfiles,
    services,
    availabilitySlots,
    categories,
} from "../db/schema.js";
import { eq, and, sql, gte, lte, ilike, or } from "drizzle-orm";
import { AppError } from "../middleware/error.js";

export async function createProviderProfile(
    userId: string,
    data: {
        name: string;
        description: string;
        address: string;
        city: string;
        lat: number;
        lng: number;
        workingHours: string;
    }
) {
    const existing = await db
        .select()
        .from(providerProfiles)
        .where(eq(providerProfiles.userId, userId))
        .limit(1);

    if (existing.length > 0) {
        // Update existing profile
        const [updated] = await db
            .update(providerProfiles)
            .set(data)
            .where(eq(providerProfiles.userId, userId))
            .returning();
        return updated;
    }

    const [profile] = await db
        .insert(providerProfiles)
        .values({ ...data, userId })
        .returning();

    if (!profile) {
        throw new AppError(500, "INTERNAL_ERROR", "Failed to create profile");
    }

    return profile;
}

export async function getProviderProfile(providerId: string) {
    const [profile] = await db
        .select()
        .from(providerProfiles)
        .where(eq(providerProfiles.id, providerId))
        .limit(1);

    if (!profile) {
        throw new AppError(404, "NOT_FOUND", "Provider not found");
    }

    const servicesList = await db
        .select()
        .from(services)
        .where(and(eq(services.providerId, providerId), eq(services.isActive, true)));

    const slots = await db
        .select()
        .from(availabilitySlots)
        .where(
            and(
                eq(availabilitySlots.providerId, providerId),
                eq(availabilitySlots.isBooked, false),
                gte(availabilitySlots.startAt, new Date())
            )
        )
        .orderBy(availabilitySlots.startAt)
        .limit(50);

    return { profile, services: servicesList, nextSlots: slots };
}

export async function getProfileByUserId(userId: string) {
    const [profile] = await db
        .select()
        .from(providerProfiles)
        .where(eq(providerProfiles.userId, userId))
        .limit(1);

    return profile ?? null;
}

export async function createService(
    providerUserId: string,
    data: {
        categoryId: string;
        title: string;
        description: string;
        durationMinutes: number;
        priceCents: number;
    }
) {
    const profile = await getProfileByUserId(providerUserId);
    if (!profile) {
        throw new AppError(400, "NO_PROFILE", "Create a provider profile first");
    }

    const [service] = await db
        .insert(services)
        .values({ ...data, providerId: profile.id })
        .returning();

    if (!service) {
        throw new AppError(500, "INTERNAL_ERROR", "Failed to create service");
    }

    return service;
}

export async function updateService(
    providerUserId: string,
    serviceId: string,
    data: {
        title?: string;
        description?: string;
        durationMinutes?: number;
        priceCents?: number;
        isActive?: boolean;
    }
) {
    const profile = await getProfileByUserId(providerUserId);
    if (!profile) {
        throw new AppError(400, "NO_PROFILE", "Provider profile not found");
    }

    const [service] = await db
        .select()
        .from(services)
        .where(and(eq(services.id, serviceId), eq(services.providerId, profile.id)))
        .limit(1);

    if (!service) {
        throw new AppError(404, "NOT_FOUND", "Service not found");
    }

    const [updated] = await db
        .update(services)
        .set(data)
        .where(eq(services.id, serviceId))
        .returning();

    return updated;
}

export async function createAvailabilitySlots(
    providerUserId: string,
    slots: Array<{ startAt: string; endAt: string; timezone: string }>
) {
    const profile = await getProfileByUserId(providerUserId);
    if (!profile) {
        throw new AppError(400, "NO_PROFILE", "Create a provider profile first");
    }

    const values = slots.map((s) => ({
        providerId: profile.id,
        startAt: new Date(s.startAt),
        endAt: new Date(s.endAt),
        timezone: s.timezone,
    }));

    return db.insert(availabilitySlots).values(values).returning();
}

export async function getProviderSchedule(providerUserId: string) {
    const profile = await getProfileByUserId(providerUserId);
    if (!profile) {
        throw new AppError(400, "NO_PROFILE", "Provider profile not found");
    }

    return db
        .select()
        .from(availabilitySlots)
        .where(eq(availabilitySlots.providerId, profile.id))
        .orderBy(availabilitySlots.startAt);
}

export async function searchProviders(params: {
    query?: string;
    categoryId?: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
}) {
    const conditions = [eq(providerProfiles.verified, true)];

    if (params.query) {
        conditions.push(
            or(
                ilike(providerProfiles.name, `%${params.query}%`),
                ilike(providerProfiles.city, `%${params.query}%`)
            ) ?? sql`true`
        );
    }

    // If filtering by category, join with services to find providers who offer that category
    if (params.categoryId) {
        const providerIdsWithCategory = await db
            .selectDistinct({ providerId: services.providerId })
            .from(services)
            .where(
                and(
                    eq(services.categoryId, params.categoryId),
                    eq(services.isActive, true)
                )
            );

        const matchingIds = providerIdsWithCategory.map((r) => r.providerId);

        if (matchingIds.length === 0) {
            return [];
        }

        conditions.push(
            sql`${providerProfiles.id} IN (${sql.join(
                matchingIds.map((id) => sql`${id}`),
                sql`, `
            )})`
        );
    }

    const query = db
        .select({
            id: providerProfiles.id,
            userId: providerProfiles.userId,
            name: providerProfiles.name,
            description: providerProfiles.description,
            address: providerProfiles.address,
            city: providerProfiles.city,
            lat: providerProfiles.lat,
            lng: providerProfiles.lng,
            workingHours: providerProfiles.workingHours,
            verified: providerProfiles.verified,
            createdAt: providerProfiles.createdAt,
        })
        .from(providerProfiles)
        .where(and(...conditions));

    let results = await query;

    // If geo params, filter by distance (Haversine approximation)
    if (params.lat !== undefined && params.lng !== undefined && params.radiusKm) {
        results = results.filter((p) => {
            const dist = haversineKm(params.lat!, params.lng!, p.lat, p.lng);
            return dist <= (params.radiusKm ?? 10);
        });
    }

    // Enrich each provider with price/duration ranges from their active services
    const enriched = await Promise.all(
        results.map(async (provider) => {
            const providerServices = await db
                .select({
                    priceCents: services.priceCents,
                    durationMinutes: services.durationMinutes,
                })
                .from(services)
                .where(
                    and(
                        eq(services.providerId, provider.id),
                        eq(services.isActive, true)
                    )
                );

            let priceRange: { min: number; max: number } | null = null;
            let durationRange: { min: number; max: number } | null = null;

            if (providerServices.length > 0) {
                const prices = providerServices.map((s) => s.priceCents);
                const durations = providerServices.map((s) => s.durationMinutes);
                priceRange = {
                    min: Math.min(...prices),
                    max: Math.max(...prices),
                };
                durationRange = {
                    min: Math.min(...durations),
                    max: Math.max(...durations),
                };
            }

            return { ...provider, priceRange, durationRange };
        })
    );

    return enriched;
}

export async function getMyServices(providerUserId: string) {
    const profile = await getProfileByUserId(providerUserId);
    if (!profile) {
        throw new AppError(400, "NO_PROFILE", "Provider profile not found");
    }

    const servicesList = await db
        .select({
            id: services.id,
            providerId: services.providerId,
            categoryId: services.categoryId,
            title: services.title,
            description: services.description,
            durationMinutes: services.durationMinutes,
            priceCents: services.priceCents,
            isActive: services.isActive,
        })
        .from(services)
        .where(eq(services.providerId, profile.id));

    // Attach category info to each service
    const result = [];
    for (const svc of servicesList) {
        const [cat] = await db
            .select()
            .from(categories)
            .where(eq(categories.id, svc.categoryId))
            .limit(1);
        result.push({ ...svc, category: cat ?? null });
    }

    return result;
}

export async function deleteService(providerUserId: string, serviceId: string) {
    const profile = await getProfileByUserId(providerUserId);
    if (!profile) {
        throw new AppError(400, "NO_PROFILE", "Provider profile not found");
    }

    const [service] = await db
        .select()
        .from(services)
        .where(and(eq(services.id, serviceId), eq(services.providerId, profile.id)))
        .limit(1);

    if (!service) {
        throw new AppError(404, "NOT_FOUND", "Service not found");
    }

    await db.delete(services).where(eq(services.id, serviceId));

    return { success: true };
}

function haversineKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

export async function getServiceDetail(serviceId: string) {
    const [service] = await db
        .select()
        .from(services)
        .where(eq(services.id, serviceId))
        .limit(1);

    if (!service) {
        throw new AppError(404, "NOT_FOUND", "Service not found");
    }

    const [category] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, service.categoryId))
        .limit(1);

    return { ...service, category: category ?? null };
}

export async function generateSlotsForService(
    providerUserId: string,
    data: {
        serviceId: string;
        date: string;
        startTime: string;
        endTime: string;
        timezone: string;
    }
) {
    const profile = await getProfileByUserId(providerUserId);
    if (!profile) {
        throw new AppError(400, "NO_PROFILE", "Create a provider profile first");
    }

    // Verify the service belongs to this provider
    const [service] = await db
        .select()
        .from(services)
        .where(
            and(
                eq(services.id, data.serviceId),
                eq(services.providerId, profile.id)
            )
        )
        .limit(1);

    if (!service) {
        throw new AppError(404, "NOT_FOUND", "Service not found or does not belong to you");
    }

    const durationMinutes = service.durationMinutes;

    // Parse times
    const [startHour, startMin] = data.startTime.split(":").map(Number);
    const [endHour, endMin] = data.endTime.split(":").map(Number);

    const baseDate = new Date(data.date + "T00:00:00");
    const dayStart = new Date(baseDate);
    dayStart.setHours(startHour!, startMin!, 0, 0);
    const dayEnd = new Date(baseDate);
    dayEnd.setHours(endHour!, endMin!, 0, 0);

    if (dayEnd <= dayStart) {
        throw new AppError(400, "INVALID_TIME", "End time must be after start time");
    }

    // Delete existing unbooked slots for this service on this date
    const dayEndBound = new Date(baseDate);
    dayEndBound.setHours(23, 59, 59, 999);

    await db
        .delete(availabilitySlots)
        .where(
            and(
                eq(availabilitySlots.providerId, profile.id),
                eq(availabilitySlots.serviceId, data.serviceId),
                eq(availabilitySlots.isBooked, false),
                gte(availabilitySlots.startAt, dayStart),
                lte(availabilitySlots.startAt, dayEndBound)
            )
        );

    // Generate slots
    const slots: Array<{
        providerId: string;
        serviceId: string;
        startAt: Date;
        endAt: Date;
        timezone: string;
    }> = [];

    let cursor = new Date(dayStart);
    while (true) {
        const slotEnd = new Date(cursor.getTime() + durationMinutes * 60 * 1000);
        if (slotEnd > dayEnd) break;

        slots.push({
            providerId: profile.id,
            serviceId: data.serviceId,
            startAt: new Date(cursor),
            endAt: slotEnd,
            timezone: data.timezone,
        });

        cursor = slotEnd;
    }

    if (slots.length === 0) {
        throw new AppError(400, "NO_SLOTS", "Time range is too short for the service duration");
    }

    const created = await db.insert(availabilitySlots).values(slots).returning();
    return created;
}

export async function getServiceSlots(providerId: string, serviceId: string) {
    return db
        .select()
        .from(availabilitySlots)
        .where(
            and(
                eq(availabilitySlots.providerId, providerId),
                eq(availabilitySlots.serviceId, serviceId),
                eq(availabilitySlots.isBooked, false),
                gte(availabilitySlots.startAt, new Date())
            )
        )
        .orderBy(availabilitySlots.startAt)
        .limit(50);
}

export async function getSlotDetail(slotId: string) {
    const [slot] = await db
        .select()
        .from(availabilitySlots)
        .where(eq(availabilitySlots.id, slotId))
        .limit(1);
    return slot;
}

export async function updateAvailabilitySlot(
    providerUserId: string,
    slotId: string,
    data: { startAt?: string; endAt?: string }
) {
    const profile = await getProfileByUserId(providerUserId);
    if (!profile) {
        throw new AppError(400, "NO_PROFILE", "Provider profile not found");
    }

    const [slot] = await db
        .select()
        .from(availabilitySlots)
        .where(
            and(
                eq(availabilitySlots.id, slotId),
                eq(availabilitySlots.providerId, profile.id)
            )
        )
        .limit(1);

    if (!slot) {
        throw new AppError(404, "NOT_FOUND", "Slot not found");
    }

    if (slot.isBooked) {
        throw new AppError(400, "ALREADY_BOOKED", "Cannot modify a booked slot");
    }

    const updateData: any = {};
    if (data.startAt) updateData.startAt = new Date(data.startAt);
    if (data.endAt) updateData.endAt = new Date(data.endAt);

    const [updated] = await db
        .update(availabilitySlots)
        .set(updateData)
        .where(eq(availabilitySlots.id, slotId))
        .returning();

    return updated;
}

export async function deleteAvailabilitySlot(
    providerUserId: string,
    slotId: string
) {
    const profile = await getProfileByUserId(providerUserId);
    if (!profile) {
        throw new AppError(400, "NO_PROFILE", "Provider profile not found");
    }

    const [slot] = await db
        .select()
        .from(availabilitySlots)
        .where(
            and(
                eq(availabilitySlots.id, slotId),
                eq(availabilitySlots.providerId, profile.id)
            )
        )
        .limit(1);

    if (!slot) {
        throw new AppError(404, "NOT_FOUND", "Slot not found");
    }

    if (slot.isBooked) {
        throw new AppError(400, "ALREADY_BOOKED", "Cannot delete a booked slot");
    }

    await db.delete(availabilitySlots).where(eq(availabilitySlots.id, slotId));

    return { success: true };
}

export async function createSingleSlot(
    providerUserId: string,
    data: {
        serviceId: string;
        date: string;      // YYYY-MM-DD
        startTime: string;  // HH:MM
        endTime: string;    // HH:MM
        timezone: string;
    }
) {
    const profile = await getProfileByUserId(providerUserId);
    if (!profile) {
        throw new AppError(400, "NO_PROFILE", "Provider profile not found");
    }

    // Validate service belongs to provider
    const [svc] = await db
        .select()
        .from(services)
        .where(
            and(eq(services.id, data.serviceId), eq(services.providerId, profile.id))
        )
        .limit(1);
    if (!svc) {
        throw new AppError(404, "NOT_FOUND", "Service not found");
    }

    const baseDate = new Date(`${data.date}T00:00:00`);
    if (isNaN(baseDate.getTime())) {
        throw new AppError(400, "INVALID_DATE", "Invalid date format");
    }

    const [sH, sM] = data.startTime.split(":").map(Number);
    const [eH, eM] = data.endTime.split(":").map(Number);
    if (sH === undefined || sM === undefined || eH === undefined || eM === undefined) {
        throw new AppError(400, "INVALID_TIME", "Invalid time format");
    }

    const start = new Date(baseDate);
    start.setHours(sH, sM, 0, 0);
    const end = new Date(baseDate);
    end.setHours(eH, eM, 0, 0);

    if (end <= start) {
        throw new AppError(400, "INVALID_TIME", "End time must be after start time");
    }

    const [created] = await db
        .insert(availabilitySlots)
        .values({
            providerId: profile.id,
            serviceId: data.serviceId,
            startAt: start,
            endAt: end,
            timezone: data.timezone,
        })
        .returning();

    return created;
}
