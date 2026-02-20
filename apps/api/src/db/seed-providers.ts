import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";
import * as schema from "./schema.js";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL =
    process.env["DATABASE_URL"] ??
    "postgresql://nearby_user:nearby_pass@localhost:5432/nearby_dev";

async function seedProviders() {
    const client = postgres(DATABASE_URL, { max: 1 });
    const db = drizzle(client, { schema });

    console.log("🌱 Seeding 5 providers with services...\n");

    const passwordHash = await bcrypt.hash("provider123!", 12);

    // ─── Fetch existing categories ───────────────────────
    const existingCategories = await db
        .select()
        .from(schema.categories);

    const catMap: Record<string, string> = {};
    for (const cat of existingCategories) {
        catMap[cat.name] = cat.id;
    }

    console.log(`  📂 Found ${existingCategories.length} categories: ${existingCategories.map(c => c.name).join(", ")}`);

    // ─── Provider definitions ────────────────────────────
    const providers = [
        {
            email: "provider1@nearby.app",
            firstName: "Ahmed",
            lastName: "Benali",
            phone: "+33 6 12 34 56 78",
            profile: {
                name: "Ahmed's Plumbing Pro",
                description: "Expert plumber with 10+ years of experience. Emergency repairs, installations, and maintenance for residential and commercial properties.",
                address: "45 Avenue Victor Hugo",
                city: "Lyon",
                lat: 45.7640,
                lng: 4.8357,
                workingHours: "Mon-Sat: 8:00-19:00",
                verified: true,
            },
            services: [
                {
                    categoryName: "Plumbing",
                    title: "Emergency Leak Repair",
                    description: "Fast response for burst pipes, leaking faucets, and water damage prevention. Available 7 days a week.",
                    durationMinutes: 90,
                    priceCents: 8500,
                },
                {
                    categoryName: "Plumbing",
                    title: "Bathroom Installation",
                    description: "Complete bathroom plumbing setup including sink, toilet, shower, and bathtub installation.",
                    durationMinutes: 240,
                    priceCents: 25000,
                },
            ],
        },
        {
            email: "provider2@nearby.app",
            firstName: "Sophie",
            lastName: "Laurent",
            phone: "+33 6 98 76 54 32",
            profile: {
                name: "FitLife Coaching",
                description: "Certified personal trainer and nutrition coach. Transform your body and mind with personalized workout plans and meal prep guidance.",
                address: "12 Rue du Sport",
                city: "Paris",
                lat: 48.8566,
                lng: 2.3522,
                workingHours: "Mon-Fri: 6:00-21:00, Sat: 8:00-14:00",
                verified: true,
            },
            services: [
                {
                    categoryName: "Fitness & Coaching",
                    title: "1-on-1 Personal Training",
                    description: "Personalized workout session tailored to your fitness goals. Includes warm-up, strength training, and cooldown.",
                    durationMinutes: 60,
                    priceCents: 6000,
                },
                {
                    categoryName: "Fitness & Coaching",
                    title: "Nutrition Consultation",
                    description: "In-depth analysis of your diet with a customized meal plan and recipe suggestions for your goals.",
                    durationMinutes: 45,
                    priceCents: 4500,
                },
            ],
        },
        {
            email: "provider3@nearby.app",
            firstName: "Karim",
            lastName: "Mekki",
            phone: "+33 7 11 22 33 44",
            profile: {
                name: "Karim's Math Academy",
                description: "Experienced math tutor specializing in high school and university level mathematics. SAT/ACT prep and exam coaching available.",
                address: "8 Place de la République",
                city: "Marseille",
                lat: 43.2965,
                lng: 5.3698,
                workingHours: "Mon-Fri: 14:00-20:00, Sat: 9:00-17:00",
                verified: false,
            },
            services: [
                {
                    categoryName: "Tutoring",
                    title: "High School Math Tutoring",
                    description: "One-on-one tutoring for algebra, geometry, trigonometry, and calculus. Homework help and exam preparation included.",
                    durationMinutes: 60,
                    priceCents: 3500,
                },
            ],
        },
        {
            email: "provider4@nearby.app",
            firstName: "Claire",
            lastName: "Moreau",
            phone: "+33 6 55 66 77 88",
            profile: {
                name: "Sparkle Clean Services",
                description: "Professional eco-friendly home cleaning. We use only natural, non-toxic products. Deep cleaning, regular maintenance, and move-in/move-out cleaning.",
                address: "22 Boulevard Haussmann",
                city: "Paris",
                lat: 48.8738,
                lng: 2.3320,
                workingHours: "Mon-Fri: 8:00-18:00",
                verified: true,
            },
            services: [
                {
                    categoryName: "Home Cleaning",
                    title: "Standard Home Cleaning",
                    description: "Complete cleaning of your home: dusting, vacuuming, mopping, kitchen and bathroom deep clean.",
                    durationMinutes: 120,
                    priceCents: 7500,
                },
                {
                    categoryName: "Home Cleaning",
                    title: "Deep Clean & Sanitization",
                    description: "Thorough deep cleaning including behind appliances, inside cabinets, window washing, and full sanitization.",
                    durationMinutes: 240,
                    priceCents: 15000,
                },
            ],
        },
        {
            email: "provider5@nearby.app",
            firstName: "Youssef",
            lastName: "Tazi",
            phone: "+33 7 99 88 77 66",
            profile: {
                name: "Classic Cuts Barbershop",
                description: "Traditional barbershop meets modern style. Expert fades, beard grooming, and hot towel shaves in a relaxed atmosphere.",
                address: "3 Rue de Rivoli",
                city: "Paris",
                lat: 48.8560,
                lng: 2.3600,
                workingHours: "Tue-Sat: 9:00-19:00",
                verified: true,
            },
            services: [
                {
                    categoryName: "Beauty & Wellness",
                    title: "Classic Haircut & Fade",
                    description: "Precision haircut with your choice of style. Includes wash, cut, and styling with premium products.",
                    durationMinutes: 30,
                    priceCents: 2500,
                },
                {
                    categoryName: "Beauty & Wellness",
                    title: "Beard Trim & Hot Towel Shave",
                    description: "Professional beard shaping and grooming with a relaxing hot towel treatment and premium oils.",
                    durationMinutes: 30,
                    priceCents: 2000,
                },
            ],
        },
    ];

    // ─── Insert each provider ────────────────────────────
    for (const p of providers) {
        // Check if user already exists
        const existing = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, p.email))
            .limit(1);

        if (existing.length > 0) {
            console.log(`  ⏭️  Skipping ${p.email} (already exists)`);
            continue;
        }

        // Create user
        const userId = uuid();
        await db.insert(schema.users).values({
            id: userId,
            email: p.email,
            passwordHash: passwordHash,
            firstName: p.firstName,
            lastName: p.lastName,
            phone: p.phone,
            role: "PROVIDER",
            status: "ACTIVE",
        });

        // Create provider profile
        const profileId = uuid();
        await db.insert(schema.providerProfiles).values({
            id: profileId,
            userId: userId,
            name: p.profile.name,
            description: p.profile.description,
            address: p.profile.address,
            city: p.profile.city,
            lat: p.profile.lat,
            lng: p.profile.lng,
            workingHours: p.profile.workingHours,
            verified: p.profile.verified,
        });

        console.log(`  ✅ ${p.email} → ${p.profile.name} (${p.firstName} ${p.lastName})`);

        // Create services
        for (const svc of p.services) {
            const categoryId = catMap[svc.categoryName];
            if (!categoryId) {
                console.log(`    ⚠️  Category "${svc.categoryName}" not found, skipping service "${svc.title}"`);
                continue;
            }

            await db.insert(schema.services).values({
                id: uuid(),
                providerId: profileId,
                categoryId: categoryId,
                title: svc.title,
                description: svc.description,
                durationMinutes: svc.durationMinutes,
                priceCents: svc.priceCents,
            });
            console.log(`    📦 Service: ${svc.title} — $${(svc.priceCents / 100).toFixed(2)}`);
        }

        // Create availability slots for the next 7 days
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
                    providerId: profileId,
                    startAt,
                    endAt,
                    isBooked: false,
                    timezone: "Europe/Paris",
                });
            }
        }

        await db.insert(schema.availabilitySlots).values(slots);
        console.log(`    🗓️  ${slots.length} availability slots created`);
        console.log("");
    }

    console.log("🎉 Provider seeding complete!");
    await client.end();
    process.exit(0);
}

seedProviders().catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});
