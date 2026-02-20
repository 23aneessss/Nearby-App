import type { Request, Response, NextFunction } from "express";
import type { ZodSchema, ZodError } from "zod";

type ValidationTarget = "body" | "query" | "params";

export function validate(schema: ZodSchema, target: ValidationTarget = "body") {
    return (req: Request, res: Response, next: NextFunction): void => {
        const data =
            target === "body"
                ? req.body
                : target === "query"
                    ? req.query
                    : req.params;

        const result = schema.safeParse(data);

        if (!result.success) {
            const zodError = result.error as ZodError;
            res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid request data",
                    details: zodError.issues.map((issue) => ({
                        path: issue.path.join("."),
                        message: issue.message,
                    })),
                },
            });
            return;
        }

        if (target === "body") {
            req.body = result.data;
        }

        next();
    };
}
