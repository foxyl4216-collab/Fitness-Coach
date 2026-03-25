import { Router } from "express";
import { supabase } from "../config/supabase";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";

const router = Router();

router.get("/status", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", req.userId!)
      .single();

    if (error || !data) {
      return res.json({
        plan_type: "free",
        status: "active",
        isActive: false,
        end_date: null,
      });
    }

    let planType = data.plan_type || "free";
    let status = data.status || "active";

    if (planType !== "free" && data.end_date) {
      const now = new Date();
      const endDate = new Date(data.end_date);
      if (now > endDate) {
        status = "expired";
        planType = "free";

        await supabase
          .from("subscriptions")
          .update({ status: "expired", plan_type: "free" })
          .eq("user_id", req.userId!);
      }
    }

    return res.json({
      plan_type: planType,
      status,
      isActive: status === "active" && planType !== "free",
      start_date: data.start_date,
      end_date: data.end_date,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.post("/subscribe", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { plan } = req.body;

    if (!plan || !["monthly", "yearly"].includes(plan)) {
      return res.status(400).json({ error: "plan must be 'monthly' or 'yearly'" });
    }

    const now = new Date();
    const endDate = new Date(now);

    if (plan === "monthly") {
      endDate.setDate(endDate.getDate() + 30);
    } else {
      endDate.setDate(endDate.getDate() + 365);
    }

    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", req.userId!)
      .single();

    let result;

    if (existing) {
      const { data, error } = await supabase
        .from("subscriptions")
        .update({
          plan_type: plan,
          status: "active",
          start_date: now.toISOString(),
          end_date: endDate.toISOString(),
        })
        .eq("user_id", req.userId!)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      result = data;
    } else {
      const { data, error } = await supabase
        .from("subscriptions")
        .insert({
          user_id: req.userId!,
          plan_type: plan,
          status: "active",
          start_date: now.toISOString(),
          end_date: endDate.toISOString(),
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      result = data;
    }

    const price = plan === "monthly" ? 9 : 99;

    return res.status(200).json({
      success: true,
      message: `Successfully subscribed to ${plan} plan`,
      subscription: {
        plan_type: result.plan_type,
        status: result.status,
        start_date: result.start_date,
        end_date: result.end_date,
        isActive: true,
        price_usd: price,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.post("/cancel", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        plan_type: "free",
        status: "expired",
        end_date: new Date().toISOString(),
      })
      .eq("user_id", req.userId!)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.json({
      success: true,
      message: "Subscription cancelled. Downgraded to free plan.",
      subscription: data,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

export default router;
