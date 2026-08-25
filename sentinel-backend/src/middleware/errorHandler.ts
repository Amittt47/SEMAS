import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(err.message, { stack: err.stack });

  if (err.name === "AppError") {
    const ae = err as AppError;
    res.status(ae.statusCode).json({ error: ae.message });
    return;
  }

  if (err.name === "ValidationError") {
    res.status(400).json({ error: "Validation failed", details: err.message });
    return;
  }

  if (err.name === "CastError") {
    res.status(400).json({ error: "Invalid ID format" });
    return;
  }

  if (err.message?.includes("duplicate key")) {
    res.status(409).json({ error: "Resource already exists" });
    return;
  }

  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
}
