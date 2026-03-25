import type { Response, NextFunction } from "express";
import { supabase } from "../config/supabase";
import type { AuthenticatedRequest } from "./auth";

export interface SubscriptionInfo {
  plan_type: "free" | "monthly" | "yearly";
  status: "active" | "expired";
  isActive: boolean;
  end_date: string | null;
}

export async function checkSubscription(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("plan_type, status, start_date, end_date")
      .eq("user_id", req.userId)
      .single();

    if (error || !data) {
      req.subscription = { plan_type: "free", status: "active", isActive: false, end_date: null };
      return next();
    }

    let planType: "free" | "monthly" | "yearly" = data.plan_type || "free";
    let status: "active" | "expired" = data.status || "active";

    if (planType !== "free" && data.end_date) {
      const now = new Date();
      const endDate = new Date(data.end_date);
      if (now > endDate) {
        status = "expired";
        planType = "free";

        await supabase
          .from("subscriptions")
          .update({ status: "expired", plan_type: "free" })
          .eq("user_id", req.userId);
      }
    }

    req.subscription = {
      plan_type: planType,
      status,
      isActive: status === "active" && planType !== "free",
      end_date: data.end_date || null,
    };

    next();
  } catch (err) {
    req.subscription = { plan_type: "free", status: "active", isActive: false, end_date: null };
    next();
  }
}

export function requirePremium(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const sub = req.subscription;
  if (!sub || sub.plan_type === "free" || !sub.isActive) {
    return res.status(403).json({
      success: false,
      message: "Premium required",
      upgrade_required: true,
    });
  }
  next();
}
