import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import type { Role } from "@nearby/shared";

export interface JwtPayload {
    userId: string;
    email: string;
    role: Role;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({
            success: false,
            error: { code: "UNAUTHORIZED", message: "Missing or invalid token" },
        });
        return;
    }

    const token = header.slice(7);
    try {
        const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
        req.user = payload;
        next();
    } catch {
        res.status(401).json({
            success: false,
            error: { code: "UNAUTHORIZED", message: "Token expired or invalid" },
        });
    }
}

export function authorize(...roles: Role[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: { code: "UNAUTHORIZED", message: "Not authenticated" },
            });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: { code: "FORBIDDEN", message: "Insufficient permissions" },
            });
            return;
        }

        next();
    };
}
