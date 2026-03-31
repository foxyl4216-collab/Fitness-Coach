import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth";

interface RateLimitBucket {
  count: number;
  date: string; // YYYY-MM-DD
}

const buckets = new Map<string, RateLimitBucket>();

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getBucket(key: string): RateLimitBucket {
  const today = todayStr();
  const existing = buckets.get(key);
  if (existing && existing.date === today) return existing;
  const fresh: RateLimitBucket = { count: 0, date: today };
  buckets.set(key, fresh);
  return fresh;
}

export function aiRateLimit(task: string, limitPerDay: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = (req as AuthenticatedRequest).userId || req.ip || "anon";
    const key = `${userId}:${task}:${todayStr()}`;
    const bucket = getBucket(key);

    if (bucket.count >= limitPerDay) {
      res.status(429).json({
        error: `Daily limit reached for ${task} (${limitPerDay}/day). Try again tomorrow.`,
        limit: limitPerDay,
        task,
      });
      return;
    }

    bucket.count++;
    next();
  };
}

export function getRateLimitStatus(userId: string, task: string): { used: number; limit: number; remaining: number } {
  const LIMITS: Record<string, number> = { diet: 5, workout: 5, camera_food: 10, adaptation: 5 };
  const limit = LIMITS[task] || 10;
  const key = `${userId}:${task}:${todayStr()}`;
  const bucket = getBucket(key);
  return { used: bucket.count, limit, remaining: Math.max(0, limit - bucket.count) };
}
