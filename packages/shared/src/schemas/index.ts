import { z } from "zod";

// ─── Auth Schemas ────────────────────────────────────────

// Base fields shared by both Client and Provider sign-up
const signUpBase = {
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    firstName: z.string().min(1, "First name is required").max(50),
    lastName: z.string().min(1, "Last name is required").max(50),
    phone: z.string().min(6, "Phone number is required").max(20).optional(),
};

// Client sign-up: base fields only
export const clientSignUpSchema = z.object({
    ...signUpBase,
    role: z.literal("CLIENT").default("CLIENT"),
});

// Provider sign-up: base fields + business info
export const providerSignUpSchema = z.object({
    ...signUpBase,
    role: z.literal("PROVIDER"),
    phone: z.string().min(6, "Phone number is required").max(20),
    businessName: z.string().min(1, "Business name is required").max(200),
    profession: z.string().min(1, "Profession is required").max(200),
    serviceDescription: z.string().min(10, "Describe your services (min 10 chars)").max(2000),
    address: z.string().min(1, "Address is required").max(500),
    city: z.string().min(1, "City is required").max(100),
    workingHours: z.string().min(1, "Working hours are required").max(500).optional().default("Mon-Fri 9:00-17:00"),
});

// Union schema for the API (accepts both)
export const signUpSchema = z.discriminatedUnion("role", [
    clientSignUpSchema,
    providerSignUpSchema,
]);

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

// ─── Category Schemas ────────────────────────────────────
export const createCategorySchema = z.object({
    name: z.string().min(1).max(100),
    icon: z.string().min(1).max(50),
});

// ─── Provider Profile Schemas ────────────────────────────
export const createProviderProfileSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    address: z.string().min(1).max(500),
    city: z.string().min(1).max(100),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    workingHours: z.string().min(1).max(500),
});

// ─── Service Schemas ─────────────────────────────────────
export const createServiceSchema = z.object({
    categoryId: z.string().uuid(),
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    durationMinutes: z.number().int().min(5).max(480),
    priceCents: z.number().int().min(0),
});

export const updateServiceSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(2000).optional(),
    durationMinutes: z.number().int().min(5).max(480).optional(),
    priceCents: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
});

// ─── Availability Schemas ────────────────────────────────
export const createAvailabilitySlotsSchema = z.object({
    slots: z
        .array(
            z.object({
                startAt: z.string().datetime(),
                endAt: z.string().datetime(),
                timezone: z.string().min(1).max(50),
            })
        )
        .min(1)
        .max(100),
});

// ─── Booking Schemas ─────────────────────────────────────
export const createBookingSchema = z.object({
    serviceId: z.string().uuid(),
    slotId: z.string().uuid(),
    note: z.string().max(1000).optional(),
});

// ─── Search Schemas ──────────────────────────────────────
export const searchProvidersSchema = z.object({
    query: z.string().optional(),
    categoryId: z.string().uuid().optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().min(1).max(200).optional().default(10),
});

// ─── Review Schemas ──────────────────────────────────────
export const createReviewSchema = z.object({
    bookingId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().min(1).max(2000),
});

// ─── Support Ticket Schemas ──────────────────────────────
export const createTicketSchema = z.object({
    bookingId: z.string().uuid().optional(),
    message: z.string().min(1).max(5000),
});
