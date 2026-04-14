import type { Request, Response, NextFunction } from "express";

interface WindowEntry {
  attempts: number[];
}

const loginWindows = new Map<string, WindowEntry>();
const signupWindows = new Map<string, WindowEntry>();

function getIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function isWithinLimit(
  store: Map<string, WindowEntry>,
  key: string,
  windowMs: number,
  maxAttempts: number
): boolean {
  const now = Date.now();
  const entry = store.get(key) || { attempts: [] };

  entry.attempts = entry.attempts.filter((t) => now - t < windowMs);
  entry.attempts.push(now);
  store.set(key, entry);

  return entry.attempts.length <= maxAttempts;
}

function secondsUntilReset(store: Map<string, WindowEntry>, key: string, windowMs: number): number {
  const entry = store.get(key);
  if (!entry || entry.attempts.length === 0) return 0;
  const oldest = Math.min(...entry.attempts);
  return Math.ceil((oldest + windowMs - Date.now()) / 1000);
}

export function loginRateLimit(req: Request, res: Response, next: NextFunction): void {
  const WINDOW_MS = 15 * 60 * 1000;
  const MAX_ATTEMPTS = 8;
  const key = getIp(req);

  if (!isWithinLimit(loginWindows, key, WINDOW_MS, MAX_ATTEMPTS)) {
    const retryAfter = secondsUntilReset(loginWindows, key, WINDOW_MS);
    res.status(429).json({
      success: false,
      message: `Too many login attempts. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
      retry_after: retryAfter,
    });
    return;
  }

  next();
}

export function signupRateLimit(req: Request, res: Response, next: NextFunction): void {
  const WINDOW_MS = 60 * 60 * 1000;
  const MAX_ATTEMPTS = 5;
  const key = getIp(req);

  if (!isWithinLimit(signupWindows, key, WINDOW_MS, MAX_ATTEMPTS)) {
    const retryAfter = secondsUntilReset(signupWindows, key, WINDOW_MS);
    res.status(429).json({
      success: false,
      message: "Too many accounts created from this device. Please try again later.",
      retry_after: retryAfter,
    });
    return;
  }

  next();
}

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  const WINDOW_MS = 60 * 60 * 1000;
  for (const [key, entry] of loginWindows.entries()) {
    entry.attempts = entry.attempts.filter((t) => now - t < WINDOW_MS);
    if (entry.attempts.length === 0) loginWindows.delete(key);
  }
  for (const [key, entry] of signupWindows.entries()) {
    entry.attempts = entry.attempts.filter((t) => now - t < WINDOW_MS);
    if (entry.attempts.length === 0) signupWindows.delete(key);
  }
}, 30 * 60 * 1000);
if (typeof cleanupTimer === "object" && cleanupTimer !== null && "unref" in cleanupTimer) {
  (cleanupTimer as NodeJS.Timeout).unref();
}
