import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Sentry } from "../config/sentry.js";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: "request_failed", message: err.message });
    return;
  }
  // Validation errors → 400 with the first readable message.
  if (err instanceof ZodError) {
    res.status(400).json({ error: "validation_error", message: err.issues[0]?.message ?? "Invalid request" });
    return;
  }
  console.error("[error]", err);
  Sentry.captureException(err);
  res.status(500).json({ error: "internal_error", message: "Something went wrong" });
}

// Wrap async handlers so thrown errors reach the error handler.
export function asyncHandler<T extends Request>(fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as T, res, next)).catch(next);
  };
}
