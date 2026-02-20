import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createCategorySchema } from "@nearby/shared";
import * as adminService from "../services/admin.service.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

// Categories
router.post(
    "/categories",
    validate(createCategorySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await adminService.createCategory(
                req.body.name,
                req.body.icon
            );
            res.status(201).json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.patch(
    "/categories/:id/toggle",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await adminService.toggleCategory(req.params["id"]!);
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

// Providers
router.get(
    "/providers",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const verified =
                req.query["verified"] === "true"
                    ? true
                    : req.query["verified"] === "false"
                        ? false
                        : undefined;
            const data = await adminService.getAdminProviders(verified);
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.post(
    "/providers/:id/verify",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await adminService.verifyProvider(
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
    "/providers/:id/block",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await adminService.blockProvider(
                req.params["id"]!,
                req.user!.userId
            );
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

// Reviews
router.get(
    "/reviews",
    async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await adminService.getReviews();
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

router.post(
    "/reviews/:id/hide",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await adminService.hideReview(
                req.params["id"]!,
                req.user!.userId
            );
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

// Stats
router.get(
    "/stats",
    async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await adminService.getAdminStats();
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

// Audit
router.get(
    "/audit",
    async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await adminService.getAuditLogs();
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

// Tickets
router.post(
    "/tickets/:id/resolve",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await adminService.resolveTicket(
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
