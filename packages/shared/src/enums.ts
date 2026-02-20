// ─── Role ────────────────────────────────────────────────
export const Role = {
    ADMIN: "ADMIN",
    PROVIDER: "PROVIDER",
    CLIENT: "CLIENT",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

// ─── User Status ─────────────────────────────────────────
export const UserStatus = {
    ACTIVE: "ACTIVE",
    BLOCKED: "BLOCKED",
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

// ─── Booking Status ──────────────────────────────────────
export const BookingStatus = {
    PENDING: "PENDING",
    CONFIRMED: "CONFIRMED",
    REJECTED: "REJECTED",
    CANCELLED: "CANCELLED",
} as const;
export type BookingStatus =
    (typeof BookingStatus)[keyof typeof BookingStatus];

// ─── Notification Type ───────────────────────────────────
export const NotificationType = {
    BOOKING_CREATED: "BOOKING_CREATED",
    BOOKING_CONFIRMED: "BOOKING_CONFIRMED",
    BOOKING_REJECTED: "BOOKING_REJECTED",
    BOOKING_CANCELLED: "BOOKING_CANCELLED",
    BOOKING_REMINDER: "BOOKING_REMINDER",
    PROVIDER_VERIFIED: "PROVIDER_VERIFIED",
    PROVIDER_BLOCKED: "PROVIDER_BLOCKED",
} as const;
export type NotificationType =
    (typeof NotificationType)[keyof typeof NotificationType];

// ─── Ticket Status ───────────────────────────────────────
export const TicketStatus = {
    OPEN: "OPEN",
    RESOLVED: "RESOLVED",
} as const;
export type TicketStatus =
    (typeof TicketStatus)[keyof typeof TicketStatus];
