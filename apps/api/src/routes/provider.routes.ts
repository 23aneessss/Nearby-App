import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
    createProviderProfileSchema,
    createServiceSchema,
    updateServiceSchema,
    createAvailabilitySlotsSchema,
} from "@nearby/shared";
import * as providerService from "../services/provider.service.js";
import * as bookingService from "../services/booking.service.js";

const router = Router();

router.use(authenticate, authorize("PROVIDER"));

router.post(
    "/profile",
    validate(createProviderProfileSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await providerService.createProviderProfile(
                req.user!.userId,
                req.body
            );
            res.status(201).json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.post(
    "/services",
    validate(createServiceSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await providerService.createService(
                req.user!.userId,
                req.body
            );
            res.status(201).json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.get(
    "/services",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await providerService.getMyServices(req.user!.userId);
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.delete(
    "/services/:id",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await providerService.deleteService(
                req.user!.userId,
                req.params["id"]!
            );
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.patch(
    "/services/:id",
    validate(updateServiceSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await providerService.updateService(
                req.user!.userId,
                req.params["id"]!,
                req.body
            );
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.post(
    "/availability",
    validate(createAvailabilitySlotsSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await providerService.createAvailabilitySlots(
                req.user!.userId,
                req.body.slots
            );
            res.status(201).json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.get(
    "/bookings",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const profile = await providerService.getProfileByUserId(
                req.user!.userId
            );
            if (!profile) {
                res.status(400).json({
                    success: false,
                    error: { code: "NO_PROFILE", message: "Create a profile first" },
                });
                return;
            }
            const data = await bookingService.getProviderBookings(profile.id);
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.post(
    "/bookings/:id/accept",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await bookingService.acceptBooking(
                req.params["id"]!,
                req.user!.userId
            );
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.post(
    "/bookings/:id/reject",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await bookingService.rejectBooking(
                req.params["id"]!,
                req.user!.userId
            );
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.get(
    "/schedule",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await providerService.getProviderSchedule(
                req.user!.userId
            );
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
