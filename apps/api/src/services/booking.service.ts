import { db } from "../db/client.js";
import {
    bookings,
    availabilitySlots,
    services,
    providerProfiles,
    users,
} from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { config } from "../config.js";
import { AppError } from "../middleware/error.js";
import { createAuditLog } from "./audit.service.js";
import { createNotification } from "./notification.service.js";
import { BookingStatus, NotificationType } from "@nearby/shared";

export async function createBooking(
    clientId: string,
    serviceId: string,
    slotId: string,
    note?: string
) {
    // Validate service exists
    const [service] = await db
        .select()
        .from(services)
        .where(eq(services.id, serviceId))
        .limit(1);
    if (!service) {
        throw new AppError(404, "NOT_FOUND", "Service not found");
    }

    // Validate slot exists and belongs to the service's provider
    const [slot] = await db
        .select()
        .from(availabilitySlots)
        .where(eq(availabilitySlots.id, slotId))
        .limit(1);
    if (!slot) {
        throw new AppError(404, "NOT_FOUND", "Slot not found");
    }
    if (slot.providerId !== service.providerId) {
        throw new AppError(400, "INVALID_SLOT", "Slot does not belong to this service's provider");
    }
    if (slot.isBooked) {
        throw new AppError(409, "SLOT_TAKEN", "This slot is already booked");
    }

    // Atomic: mark slot as booked + create booking
    const [updatedSlot] = await db
        .update(availabilitySlots)
        .set({ isBooked: true })
        .where(and(eq(availabilitySlots.id, slotId), eq(availabilitySlots.isBooked, false)))
        .returning();

    if (!updatedSlot) {
        throw new AppError(409, "SLOT_TAKEN", "Slot was booked by another user");
    }

    const [booking] = await db
        .insert(bookings)
        .values({
            clientId,
            providerId: service.providerId,
            serviceId,
            slotId,
            note: note ?? null,
            status: "PENDING",
        })
        .returning();

    if (!booking) {
        throw new AppError(500, "INTERNAL_ERROR", "Failed to create booking");
    }

    // Get provider user for notification
    const [profile] = await db
        .select()
        .from(providerProfiles)
        .where(eq(providerProfiles.id, service.providerId))
        .limit(1);

    if (profile) {
        await createNotification(
            profile.userId,
            NotificationType.BOOKING_CREATED,
            "New Booking Request",
            `You have a new booking request for ${service.title}`
        );
    }

    await createAuditLog(clientId, "BOOKING_CREATED", "booking", booking.id, {
        serviceId,
        slotId,
    });

    return booking;
}

export async function getClientBookings(clientId: string) {
    const results = await db
        .select({
            id: bookings.id,
            clientId: bookings.clientId,
            providerId: bookings.providerId,
            serviceId: bookings.serviceId,
            slotId: bookings.slotId,
            status: bookings.status,
            note: bookings.note,
            createdAt: bookings.createdAt,
            updatedAt: bookings.updatedAt,
            serviceTitle: services.title,
            servicePriceCents: services.priceCents,
            slotStartAt: availabilitySlots.startAt,
            slotEndAt: availabilitySlots.endAt,
        })
        .from(bookings)
        .leftJoin(services, eq(bookings.serviceId, services.id))
        .leftJoin(availabilitySlots, eq(bookings.slotId, availabilitySlots.id))
        .where(eq(bookings.clientId, clientId))
        .orderBy(sql`${bookings.createdAt} DESC`);

    return results.map(row => ({
        id: row.id,
        clientId: row.clientId,
        providerId: row.providerId,
        serviceId: row.serviceId,
        slotId: row.slotId,
        status: row.status,
        note: row.note,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        service: row.serviceTitle ? {
            id: row.serviceId,
            title: row.serviceTitle,
            priceCents: row.servicePriceCents ?? 0,
        } : undefined,
        slot: (row.slotStartAt && row.slotEndAt) ? {
            id: row.slotId,
            startAt: row.slotStartAt.toISOString(),
            endAt: row.slotEndAt.toISOString(),
        } : undefined,
    }));
}

export async function getProviderBookings(providerProfileId: string) {
    const results = await db
        .select({
            id: bookings.id,
            clientId: bookings.clientId,
            providerId: bookings.providerId,
            serviceId: bookings.serviceId,
            slotId: bookings.slotId,
            status: bookings.status,
            note: bookings.note,
            createdAt: bookings.createdAt,
            updatedAt: bookings.updatedAt,
            serviceTitle: services.title,
            slotStartAt: availabilitySlots.startAt,
            slotEndAt: availabilitySlots.endAt,
            clientEmail: users.email,
            clientFirstName: users.firstName,
            clientLastName: users.lastName,
        })
        .from(bookings)
        .leftJoin(services, eq(bookings.serviceId, services.id))
        .leftJoin(availabilitySlots, eq(bookings.slotId, availabilitySlots.id))
        .leftJoin(users, eq(bookings.clientId, users.id))
        .where(eq(bookings.providerId, providerProfileId))
        .orderBy(sql`${bookings.createdAt} DESC`);

    return results.map(row => ({
        id: row.id,
        clientId: row.clientId,
        providerId: row.providerId,
        serviceId: row.serviceId,
        slotId: row.slotId,
        status: row.status,
        note: row.note,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        service: row.serviceTitle ? {
            id: row.serviceId,
            title: row.serviceTitle,
        } : undefined,
        slot: (row.slotStartAt && row.slotEndAt) ? {
            id: row.slotId,
            startAt: row.slotStartAt.toISOString(),
            endAt: row.slotEndAt.toISOString(),
        } : undefined,
        client: row.clientEmail ? {
            id: row.clientId,
            email: row.clientEmail,
            firstName: row.clientFirstName,
            lastName: row.clientLastName,
        } : undefined,
    }));
}

export async function acceptBooking(
    bookingId: string,
    providerUserId: string
) {
    const booking = await getBookingForProvider(bookingId, providerUserId);

    if (booking.status !== BookingStatus.PENDING) {
        throw new AppError(400, "INVALID_STATUS", "Only PENDING bookings can be accepted");
    }

    const [updated] = await db
        .update(bookings)
        .set({ status: "CONFIRMED", updatedAt: new Date() })
        .where(eq(bookings.id, bookingId))
        .returning();

    if (!updated) {
        throw new AppError(500, "INTERNAL_ERROR", "Failed to update booking");
    }

    await createNotification(
        booking.clientId,
        NotificationType.BOOKING_CONFIRMED,
        "Booking Confirmed",
        "Your booking has been confirmed by the provider"
    );

    await createAuditLog(providerUserId, "BOOKING_ACCEPTED", "booking", bookingId);

    return updated;
}

export async function rejectBooking(
    bookingId: string,
    providerUserId: string
) {
    const booking = await getBookingForProvider(bookingId, providerUserId);

    if (booking.status !== BookingStatus.PENDING) {
        throw new AppError(400, "INVALID_STATUS", "Only PENDING bookings can be rejected");
    }

    const [updated] = await db
        .update(bookings)
        .set({ status: "REJECTED", updatedAt: new Date() })
        .where(eq(bookings.id, bookingId))
        .returning();

    if (!updated) {
        throw new AppError(500, "INTERNAL_ERROR", "Failed to update booking");
    }

    // Release slot
    await db
        .update(availabilitySlots)
        .set({ isBooked: false })
        .where(eq(availabilitySlots.id, booking.slotId));

    await createNotification(
        booking.clientId,
        NotificationType.BOOKING_REJECTED,
        "Booking Rejected",
        "Your booking has been rejected by the provider"
    );

    await createAuditLog(providerUserId, "BOOKING_REJECTED", "booking", bookingId);

    return updated;
}

export async function cancelBooking(
    bookingId: string,
    clientId: string
) {
    const [booking] = await db
        .select()
        .from(bookings)
        .where(and(eq(bookings.id, bookingId), eq(bookings.clientId, clientId)))
        .limit(1);

    if (!booking) {
        throw new AppError(404, "NOT_FOUND", "Booking not found");
    }

    if (
        booking.status !== BookingStatus.PENDING &&
        booking.status !== BookingStatus.CONFIRMED
    ) {
        throw new AppError(400, "INVALID_STATUS", "This booking cannot be cancelled");
    }

    // Check cancellation window
    const [slot] = await db
        .select()
        .from(availabilitySlots)
        .where(eq(availabilitySlots.id, booking.slotId))
        .limit(1);

    if (slot) {
        const windowMs = config.cancellationWindowMinutes * 60 * 1000;
        const cutoff = new Date(slot.startAt.getTime() - windowMs);
        if (new Date() >= cutoff) {
            throw new AppError(
                400,
                "CANCELLATION_WINDOW_PASSED",
                `Cancellations must be made at least ${config.cancellationWindowMinutes} minutes before the slot`
            );
        }
    }

    const [updated] = await db
        .update(bookings)
        .set({ status: "CANCELLED", updatedAt: new Date() })
        .where(eq(bookings.id, bookingId))
        .returning();

    if (!updated) {
        throw new AppError(500, "INTERNAL_ERROR", "Failed to cancel booking");
    }

    // Release slot
    await db
        .update(availabilitySlots)
        .set({ isBooked: false })
        .where(eq(availabilitySlots.id, booking.slotId));

    // Notify provider
    const [profile] = await db
        .select()
        .from(providerProfiles)
        .where(eq(providerProfiles.id, booking.providerId))
        .limit(1);

    if (profile) {
        await createNotification(
            profile.userId,
            NotificationType.BOOKING_CANCELLED,
            "Booking Cancelled",
            "A client has cancelled their booking"
        );
    }

    await createAuditLog(clientId, "BOOKING_CANCELLED", "booking", bookingId);

    return updated;
}

async function getBookingForProvider(bookingId: string, providerUserId: string) {
    // Get provider profile
    const [profile] = await db
        .select()
        .from(providerProfiles)
        .where(eq(providerProfiles.userId, providerUserId))
        .limit(1);

    if (!profile) {
        throw new AppError(404, "NOT_FOUND", "Provider profile not found");
    }

    const [booking] = await db
        .select()
        .from(bookings)
        .where(
            and(eq(bookings.id, bookingId), eq(bookings.providerId, profile.id))
        )
        .limit(1);

    if (!booking) {
        throw new AppError(404, "NOT_FOUND", "Booking not found");
    }

    return booking;
}
