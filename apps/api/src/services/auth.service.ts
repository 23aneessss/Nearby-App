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
}

export async function signUp(data: SignUpData) {
    const { email, password, firstName, lastName, phone, role = "CLIENT" } = data;

    const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
    if (existing.length > 0) {
        throw new AppError(409, "CONFLICT", "Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [user] = await db
        .insert(users)
        .values({ email, passwordHash, firstName, lastName, phone: phone ?? null, role })
        .returning();

    if (!user) {
        throw new AppError(500, "INTERNAL_ERROR", "Failed to create user");
    }

    // If provider, auto-create profile
    if (role === "PROVIDER" && data.businessName && data.address && data.city) {
        await db.insert(providerProfiles).values({
            userId: user.id,
            name: data.businessName,
            description: data.serviceDescription || `${data.profession} services`,
            address: data.address,
            city: data.city,
            lat: 0, // will be updated later with geocoding
            lng: 0,
            workingHours: data.workingHours || "Mon-Fri 9:00-17:00",
        });
    }

    const token = generateToken(user.id, user.email, user.role);
    return {
        accessToken: token,
        user: sanitizeUser(user),
    };
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
