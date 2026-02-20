import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db/client.js";
import { users, providerProfiles } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { config } from "../config.js";
import { AppError } from "../middleware/error.js";
import type { JwtPayload } from "../middleware/auth.js";
import type { Role } from "@nearby/shared";

const SALT_ROUNDS = 12;

interface SignUpData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: "CLIENT" | "PROVIDER";
    // Provider-specific fields
    businessName?: string;
    profession?: string;
    serviceDescription?: string;
    address?: string;
    city?: string;
    workingHours?: string;
    // Compatibility fields for profile-like payloads
    name?: string;
    description?: string;
    lat?: number;
    lng?: number;
}

export async function signUp(data: SignUpData) {
    const { email, password, firstName, lastName, phone } = data;
    const role = inferSignupRole(data);

    return db.transaction(async (tx) => {
        const existing = await tx
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
        if (existing.length > 0) {
            throw new AppError(409, "CONFLICT", "Email already registered");
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const [user] = await tx
            .insert(users)
            .values({
                email,
                passwordHash,
                firstName,
                lastName,
                phone: phone ?? null,
                role,
            })
            .returning();

        if (!user) {
            throw new AppError(500, "INTERNAL_ERROR", "Failed to create user");
        }

        if (role === "PROVIDER") {
            const profileData = buildProviderProfileData(data, firstName, lastName);
            await tx.insert(providerProfiles).values({
                userId: user.id,
                ...profileData,
            });
        }

        const token = generateToken(user.id, user.email, user.role);
        return {
            accessToken: token,
            user: sanitizeUser(user),
        };
    });
}

export async function login(email: string, password: string) {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

    if (!user) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    if (user.status === "BLOCKED") {
        throw new AppError(403, "BLOCKED", "Account has been blocked");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const token = generateToken(user.id, user.email, user.role);
    return {
        accessToken: token,
        user: sanitizeUser(user),
    };
}

export async function getMe(userId: string) {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (!user) {
        throw new AppError(404, "NOT_FOUND", "User not found");
    }

    return sanitizeUser(user);
}

function generateToken(userId: string, email: string, role: Role): string {
    const payload: JwtPayload = { userId, email, role };
    return jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
}

function sanitizeUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: "ADMIN" | "PROVIDER" | "CLIENT";
    status: "ACTIVE" | "BLOCKED";
    createdAt: Date;
}) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
    };
}

function inferSignupRole(data: SignUpData): "CLIENT" | "PROVIDER" {
    if (data.role === "PROVIDER") return "PROVIDER";
    if (data.role === "CLIENT") return "CLIENT";

    const hasProviderSignal = Boolean(
        data.businessName ||
            data.profession ||
            data.serviceDescription ||
            data.address ||
            data.city ||
            data.name ||
            data.description
    );

    return hasProviderSignal ? "PROVIDER" : "CLIENT";
}

function buildProviderProfileData(
    data: SignUpData,
    firstName: string,
    lastName: string
): {
    name: string;
    description: string;
    address: string;
    city: string;
    lat: number;
    lng: number;
    workingHours: string;
} {
    const name =
        data.businessName?.trim() ||
        data.name?.trim() ||
        `${firstName} ${lastName}`.trim();
    const description =
        data.serviceDescription?.trim() ||
        data.description?.trim() ||
        (data.profession?.trim()
            ? `${data.profession.trim()} services`
            : "Local services");

    return {
        name,
        description,
        address: data.address?.trim() || "Not provided",
        city: data.city?.trim() || "Not provided",
        lat: data.lat ?? 0,
        lng: data.lng ?? 0,
        workingHours: data.workingHours?.trim() || "Mon-Fri 9:00-17:00",
    };
}
