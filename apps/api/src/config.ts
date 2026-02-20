import dotenv from "dotenv";
dotenv.config();

export const config = {
    port: parseInt(process.env["PORT"] ?? "3001", 10),
    databaseUrl: process.env["DATABASE_URL"] ?? "",
    jwtSecret: process.env["JWT_SECRET"] ?? "dev-secret",
    corsOrigin: process.env["CORS_ORIGIN"] ?? "http://localhost:8081",
    cancellationWindowMinutes: parseInt(
        process.env["CANCELLATION_WINDOW_MINUTES"] ?? "60",
        10
    ),
} as const;
