import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
    createProviderProfileSchema,
    createServiceSchema,
    updateServiceSchema,
    createAvailabilitySlotsSchema,
    generateSlotsSchema,
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

router.post(
    "/availability/generate",
    validate(generateSlotsSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await providerService.generateSlotsForService(
                req.user!.userId,
                req.body
            );
            res.status(201).json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.delete(
    "/availability/:slotId",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await providerService.deleteAvailabilitySlot(
                req.user!.userId,
                req.params["slotId"]!
            );
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.patch(
    "/availability/:slotId",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Accept date + startTime + endTime (local time), build proper Date objects
            const { date, startTime, endTime } = req.body as {
                date?: string;
                startTime?: string;
                endTime?: string;
            };

            const updateBody: { startAt?: string; endAt?: string } = {};

            if (date && startTime) {
                updateBody.startAt = new Date(`${date}T${startTime}:00`).toISOString();
            }
            if (date && endTime) {
                updateBody.endAt = new Date(`${date}T${endTime}:00`).toISOString();
            }

            const data = await providerService.updateAvailabilitySlot(
                req.user!.userId,
                req.params["slotId"]!,
                updateBody
            );
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

// POST /availability/single – manually add a single slot
router.post(
    "/availability/single",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await providerService.createSingleSlot(
                req.user!.userId,
                req.body
            );
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.get(
    "/services/:serviceId/slots",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const profile = await providerService.getProfileByUserId(req.user!.userId);
            if (!profile) {
                res.status(400).json({ success: false, error: "Profile not found" });
                return;
            }
            const data = await providerService.getServiceSlots(profile.id, req.params["serviceId"]!);
            res.json({ success: true, data });
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
