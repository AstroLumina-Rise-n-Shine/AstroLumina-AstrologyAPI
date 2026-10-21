import type { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  expose?: boolean;
  type?: string;
}

export function createError(statusCode: number, message: string): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.expose = statusCode < 500;
  return error;
}

export function payloadTooLargeHandler(
  err: AppError,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (
    err.message?.includes("entity.too.large") ||
    err.type === "entity.too.large"
  ) {
    res
      .status(413)
      .json({ error: "Request payload too large. Maximum size is 256kB." });
    return;
  }
  next(err);
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Route not found" });
}

export function globalErrorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Details (stack, message) are logged server-side only, never returned to
  // the client — the numeric status code is enough for clients to act on.
  console.error("Unhandled error:", err);

  const statusCode = err.statusCode ?? 500;

  res
    .status(statusCode)
    .json({ error: statusCode >= 500 ? "Internal server error" : err.message });
}
