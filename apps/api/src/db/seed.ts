import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import * as schema from "./schema.js";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL =
    process.env["DATABASE_URL"] ??
    "postgresql://nearby_user:nearby_pass@localhost:5432/nearby_dev";

async function seed() {
    const client = postgres(DATABASE_URL, { max: 1 });
    const db = drizzle(client, { schema });

    console.log("🌱 Seeding database...");

    // ─── Admin User ──────────────────────────────────────
    const adminId = uuid();
    const adminHash = await bcrypt.hash("admin123!", 12);
    await db.insert(schema.users).values({
        id: adminId,
        email: "admin@nearby.app",
        passwordHash: adminHash,
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
        status: "ACTIVE",
    });
    console.log("  ✅ Admin user created (admin@nearby.app / admin123!)");

    // ─── Provider User ──────────────────────────────────
    const providerUserId = uuid();
    const providerHash = await bcrypt.hash("provider123!", 12);
    await db.insert(schema.users).values({
        id: providerUserId,
        email: "provider@nearby.app",
        passwordHash: providerHash,
        firstName: "Marie",
        lastName: "Dupont",
        role: "PROVIDER",
        status: "ACTIVE",
    });

    const providerId = uuid();
    await db.insert(schema.providerProfiles).values({
        id: providerId,
        userId: providerUserId,
        name: "Marie's Beauty Salon",
        description:
            "Professional beauty services in the heart of the city. Specializing in hair styling, manicures, and skincare treatments.",
        address: "123 Rue de la Paix",
        city: "Paris",
        lat: 48.8698,
        lng: 2.3297,
        workingHours: "Mon-Fri: 9:00-18:00, Sat: 10:00-16:00",
        verified: true,
    });
    console.log(
        "  ✅ Provider created (provider@nearby.app / provider123!)"
    );

    // ─── Client User ─────────────────────────────────────
    const clientId = uuid();
    const clientHash = await bcrypt.hash("client123!", 12);
    await db.insert(schema.users).values({
        id: clientId,
        email: "client@nearby.app",
        passwordHash: clientHash,
        firstName: "Jean",
        lastName: "Martin",
        role: "CLIENT",
        status: "ACTIVE",
    });
    console.log("  ✅ Client created (client@nearby.app / client123!)");

    // ─── Categories ──────────────────────────────────────
    const categoryIds = {
        beauty: uuid(),
        plumbing: uuid(),
        cleaning: uuid(),
        fitness: uuid(),
        tutoring: uuid(),
    };

    await db.insert(schema.categories).values([
        { id: categoryIds.beauty, name: "Beauty & Wellness", icon: "sparkles" },
        { id: categoryIds.plumbing, name: "Plumbing", icon: "wrench" },
        { id: categoryIds.cleaning, name: "Home Cleaning", icon: "home" },
        { id: categoryIds.fitness, name: "Fitness & Coaching", icon: "dumbbell" },
        { id: categoryIds.tutoring, name: "Tutoring", icon: "book-open" },
    ]);
    console.log("  ✅ 5 categories created");

    // ─── Services ────────────────────────────────────────
    const service1Id = uuid();
    const service2Id = uuid();

    await db.insert(schema.services).values([
        {
            id: service1Id,
            providerId: providerId,
            categoryId: categoryIds.beauty,
            title: "Haircut & Styling",
            description:
                "Professional haircut with wash, cut, and blow-dry styling.",
            durationMinutes: 60,
            priceCents: 4500,
        },
        {
            id: service2Id,
            providerId: providerId,
            categoryId: categoryIds.beauty,
            title: "Manicure & Nail Art",
            description:
                "Complete manicure with gel polish and optional nail art designs.",
            durationMinutes: 45,
            priceCents: 3000,
        },
    ]);
    console.log("  ✅ 2 services created for provider");

    // ─── Availability Slots (next 7 days) ────────────────
    const slots = [];
    const now = new Date();
    for (let day = 1; day <= 7; day++) {
        for (let hour = 9; hour < 17; hour += 2) {
            const startAt = new Date(now);
            startAt.setDate(now.getDate() + day);
            startAt.setHours(hour, 0, 0, 0);

            const endAt = new Date(startAt);
            endAt.setHours(hour + 1, 30, 0, 0);

            slots.push({
                id: uuid(),
                providerId: providerId,
                startAt,
                endAt,
                isBooked: false,
                timezone: "Europe/Paris",
            });
        }
    }

    await db.insert(schema.availabilitySlots).values(slots);
    console.log(`  ✅ ${slots.length} availability slots created (next 7 days)`);

    console.log("\n🎉 Seed complete!");
    await client.end();
    process.exit(0);
}

seed().catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});
