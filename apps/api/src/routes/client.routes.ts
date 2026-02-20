import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
    createBookingSchema,
    searchProvidersSchema,
} from "@nearby/shared";
import * as bookingService from "../services/booking.service.js";
import * as providerService from "../services/provider.service.js";
import * as adminService from "../services/admin.service.js";

const router = Router();

// ─── Public / Client ─────────────────────────────────────
router.get(
    "/categories",
    authenticate,
    async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await adminService.getCategories();
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.get(
    "/search/providers",
    authenticate,
    validate(searchProvidersSchema, "query"),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await providerService.searchProviders({
                query: req.query["query"] as string | undefined,
                categoryId: req.query["categoryId"] as string | undefined,
                lat: req.query["lat"] ? Number(req.query["lat"]) : undefined,
                lng: req.query["lng"] ? Number(req.query["lng"]) : undefined,
                radiusKm: req.query["radiusKm"] ? Number(req.query["radiusKm"]) : undefined,
            });
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.get(
    "/providers/:providerId",
    authenticate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await providerService.getProviderProfile(
                req.params["providerId"]!
            );
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.get(
    "/services/:serviceId",
    authenticate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await providerService.getServiceDetail(
                req.params["serviceId"]!
            );
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

// ─── Bookings (Client) ──────────────────────────────────
router.post(
    "/bookings",
    authenticate,
    authorize("CLIENT"),
    validate(createBookingSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await bookingService.createBooking(
                req.user!.userId,
                req.body.serviceId,
                req.body.slotId,
                req.body.note
            );
            res.status(201).json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.get(
    "/bookings/me",
    authenticate,
    authorize("CLIENT"),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await bookingService.getClientBookings(req.user!.userId);
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.post(
    "/bookings/:id/cancel",
    authenticate,
    authorize("CLIENT"),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await bookingService.cancelBooking(
                req.params["id"]!,
                req.user!.userId
            );
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
