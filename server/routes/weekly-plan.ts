import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { supabase } from "../config/supabase";

const router = Router();

router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { week_number, calorie_target, workout_json } = req.body;

    if (!week_number || typeof week_number !== "number" || week_number < 1) {
      return res.status(400).json({ error: "week_number must be a positive integer" });
    }

    if (calorie_target !== undefined && (typeof calorie_target !== "number" || calorie_target < 0)) {
      return res.status(400).json({ error: "calorie_target must be a non-negative number" });
    }

    const { data: existing } = await supabase
      .from("weekly_plans")
      .select("id")
      .eq("user_id", req.userId!)
      .eq("week_number", week_number)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from("weekly_plans")
        .update({ calorie_target, workout_json })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ message: "Weekly plan updated", plan: data });
    }

    const { data, error } = await supabase
      .from("weekly_plans")
      .insert({
        user_id: req.userId!,
        week_number,
        calorie_target,
        workout_json,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ message: "Weekly plan created", plan: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const weekNumber = req.query.week ? parseInt(req.query.week as string) : null;

    let query = supabase
      .from("weekly_plans")
      .select("*")
      .eq("user_id", req.userId!)
      .order("week_number", { ascending: false });

    if (weekNumber) {
      query = query.eq("week_number", weekNumber);
    }

    const { data, error } = await query;

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ plans: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.get("/current", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { data, error } = await supabase
      .from("weekly_plans")
      .select("*")
      .eq("user_id", req.userId!)
      .order("week_number", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "No weekly plan found" });
    }

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ plan: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

export default router;
