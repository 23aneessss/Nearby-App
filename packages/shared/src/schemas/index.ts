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

// API signup schema:
// Accepts client and provider payloads and infers provider intent when
// provider fields are present (for frontend/backend compatibility).
export const signUpSchema = z
    .object({
        ...signUpBase,
        role: z.enum(["CLIENT", "PROVIDER"]).optional(),
        businessName: z.string().min(1).max(200).optional(),
        profession: z.string().min(1).max(200).optional(),
        serviceDescription: z
            .string()
            .min(10, "Describe your services (min 10 chars)")
            .max(2000)
            .optional(),
        address: z.string().min(1).max(500).optional(),
        city: z.string().min(1).max(100).optional(),
        workingHours: z
            .string()
            .min(1)
            .max(500)
            .optional()
            .default("Mon-Fri 9:00-17:00"),
        // Compatibility with payloads that use profile-like naming
        name: z.string().min(1).max(200).optional(),
        description: z.string().min(1).max(2000).optional(),
        lat: z.number().min(-90).max(90).optional(),
        lng: z.number().min(-180).max(180).optional(),
    })
    .superRefine((data, ctx) => {
        const hasProviderSignal = Boolean(
            data.role === "PROVIDER" ||
            data.businessName ||
            data.profession ||
            data.serviceDescription ||
            data.address ||
            data.city ||
            data.name ||
            data.description
        );

        if (!hasProviderSignal) return;

        if (!(data.businessName || data.name)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["businessName"],
                message: "Business name is required",
            });
        }
        if (!(data.serviceDescription || data.description || data.profession)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["serviceDescription"],
                message: "Describe your services",
            });
        }
        if (!data.address) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["address"],
                message: "Address is required",
            });
        }
        if (!data.city) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["city"],
                message: "City is required",
            });
        }
    })
    .transform((data) => {
        const inferredRole =
            data.role ??
            (data.businessName ||
                data.profession ||
                data.serviceDescription ||
                data.address ||
                data.city ||
                data.name ||
                data.description
                ? "PROVIDER"
                : "CLIENT");

        return { ...data, role: inferredRole };
    });

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

export const generateSlotsSchema = z.object({
    serviceId: z.string().uuid(),
    date: z.string().min(1, "Date is required"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
    timezone: z.string().min(1).max(50),
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
