import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    integer,
    timestamp,
    jsonb,
    doublePrecision,
    pgEnum,
} from "drizzle-orm/pg-core";

// ─── PG Enums ────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["ADMIN", "PROVIDER", "CLIENT"]);
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "BLOCKED"]);
export const bookingStatusEnum = pgEnum("booking_status", [
    "PENDING",
    "CONFIRMED",
    "REJECTED",
    "CANCELLED",
]);
export const ticketStatusEnum = pgEnum("ticket_status", ["OPEN", "RESOLVED"]);

// ─── Users ───────────────────────────────────────────────
export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    passwordHash: text("password_hash").notNull(),
    firstName: varchar("first_name", { length: 50 }).notNull(),
    lastName: varchar("last_name", { length: 50 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    role: roleEnum("role").default("CLIENT").notNull(),
    status: userStatusEnum("status").default("ACTIVE").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

// ─── Provider Profiles ───────────────────────────────────
export const providerProfiles = pgTable("provider_profiles", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
        .references(() => users.id)
        .unique()
        .notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description").notNull(),
    address: varchar("address", { length: 500 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    workingHours: text("working_hours").notNull(),
    verified: boolean("verified").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

// ─── Categories ──────────────────────────────────────────
export const categories = pgTable("categories", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).unique().notNull(),
    icon: varchar("icon", { length: 50 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
});

// ─── Services ────────────────────────────────────────────
export const services = pgTable("services", {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: uuid("provider_id")
        .references(() => providerProfiles.id)
        .notNull(),
    categoryId: uuid("category_id")
        .references(() => categories.id)
        .notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    priceCents: integer("price_cents").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
});

// ─── Availability Slots ──────────────────────────────────
export const availabilitySlots = pgTable("availability_slots", {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: uuid("provider_id")
        .references(() => providerProfiles.id)
        .notNull(),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    isBooked: boolean("is_booked").default(false).notNull(),
    timezone: varchar("timezone", { length: 50 }).notNull(),
});

// ─── Bookings ────────────────────────────────────────────
export const bookings = pgTable("bookings", {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
        .references(() => users.id)
        .notNull(),
    providerId: uuid("provider_id")
        .references(() => providerProfiles.id)
        .notNull(),
    serviceId: uuid("service_id")
        .references(() => services.id)
        .notNull(),
    slotId: uuid("slot_id")
        .references(() => availabilitySlots.id)
        .notNull(),
    status: bookingStatusEnum("status").default("PENDING").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

// ─── Reviews ─────────────────────────────────────────────
export const reviews = pgTable("reviews", {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id")
        .references(() => bookings.id)
        .notNull(),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    isHidden: boolean("is_hidden").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

// ─── Notifications ───────────────────────────────────────
export const notifications = pgTable("notifications", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
        .references(() => users.id)
        .notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

// ─── Audit Logs ──────────────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id")
        .references(() => users.id)
        .notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

// ─── Support Tickets ─────────────────────────────────────
export const supportTickets = pgTable("support_tickets", {
    id: uuid("id").defaultRandom().primaryKey(),
    createdByUserId: uuid("created_by_user_id")
        .references(() => users.id)
        .notNull(),
    bookingId: uuid("booking_id").references(() => bookings.id),
    message: text("message").notNull(),
    status: ticketStatusEnum("status").default("OPEN").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});
