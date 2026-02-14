import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { supabase } from "../config/supabase";

const router = Router();

router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { date, food_name, calories, source } = req.body;

    if (!date || !food_name) {
      return res.status(400).json({ error: "Missing required fields: date, food_name" });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: "Date must be in YYYY-MM-DD format" });
    }

    if (calories !== undefined && (typeof calories !== "number" || calories < 0)) {
      return res.status(400).json({ error: "Calories must be a non-negative number" });
    }

    const { data, error } = await supabase
      .from("calorie_logs")
      .insert({
        user_id: req.userId!,
        date,
        food_name,
        calories: calories || 0,
        source: source || "manual",
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ message: "Calorie log added", log: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.get("/daily", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const date = req.query.date as string;

    if (!date) {
      return res.status(400).json({ error: "Date query parameter is required (YYYY-MM-DD)" });
    }

    const { data, error } = await supabase
      .from("calorie_logs")
      .select("*")
      .eq("user_id", req.userId!)
      .eq("date", date)
      .order("created_at", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    const totalCalories = (data || []).reduce((sum, log) => sum + (log.calories || 0), 0);

    return res.json({
      date,
      total_calories: totalCalories,
      entries: data,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const { data: existing } = await supabase
      .from("calorie_logs")
      .select("id")
      .eq("id", id)
      .eq("user_id", req.userId!)
      .single();

    if (!existing) {
      return res.status(404).json({ error: "Calorie log not found" });
    }

    const { error } = await supabase
      .from("calorie_logs")
      .delete()
      .eq("id", id)
      .eq("user_id", req.userId!);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: "Calorie log deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

export default router;
