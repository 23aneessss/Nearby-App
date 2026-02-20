import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { signUpSchema, loginSchema } from "@nearby/shared";
import * as authService from "../services/auth.service.js";

const router = Router();

router.post(
    "/signup",
    validate(signUpSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await authService.signUp(req.body);
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    }
);

router.post(
    "/login",
    validate(loginSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await authService.login(req.body.email, req.body.password);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    }
);

router.get(
    "/me",
    authenticate,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = await authService.getMe(req.user!.userId);
            res.json({ success: true, data: user });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
