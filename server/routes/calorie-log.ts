import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseClient } from "../config/supabase";

const router = Router();

router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { date, food_name, calories, source } = req.body;

    if (!date || !food_name) {
      return res.status(400).json({ error: "Missing required fields: date, food_name" });
    }

    if (!food_name.trim()) {
      return res.status(400).json({ error: "food_name cannot be empty" });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: "Date must be in YYYY-MM-DD format" });
    }

    if (calories !== undefined && (typeof calories !== "number" || calories < 0)) {
      return res.status(400).json({ error: "Calories must be a non-negative number" });
    }

    const db = req.supabaseClient || getSupabaseClient();

    const { data, error } = await db
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

router.post("/manual", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { date, food_name, calories } = req.body;

    if (!food_name || !food_name.trim()) {
      return res.status(400).json({ error: "food_name is required and cannot be empty" });
    }

    if (calories === undefined || typeof calories !== "number" || calories < 0) {
      return res.status(400).json({ error: "calories must be a non-negative number" });
    }

    const logDate = date || new Date().toISOString().split("T")[0];

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(logDate)) {
      return res.status(400).json({ error: "Date must be in YYYY-MM-DD format" });
    }

    const db = req.supabaseClient || getSupabaseClient();

    const { data, error } = await db
      .from("calorie_logs")
      .insert({
        user_id: req.userId!,
        date: logDate,
        food_name: food_name.trim(),
        calories,
        source: "manual",
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ message: "Manual calorie log added", log: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.post("/camera", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { date, food_name, calories, confidence } = req.body;

    if (!food_name || !food_name.trim()) {
      return res.status(400).json({ error: "food_name is required and cannot be empty" });
    }

    if (calories === undefined || typeof calories !== "number" || calories < 0) {
      return res.status(400).json({ error: "calories must be a non-negative number" });
    }

    const logDate = date || new Date().toISOString().split("T")[0];

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(logDate)) {
      return res.status(400).json({ error: "Date must be in YYYY-MM-DD format" });
    }

    const db = req.supabaseClient || getSupabaseClient();

    const { data, error } = await db
      .from("calorie_logs")
      .insert({
        user_id: req.userId!,
        date: logDate,
        food_name: food_name.trim(),
        calories,
        source: "camera",
        confidence: confidence || null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ message: "Camera calorie log added", log: data });
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

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: "Date must be in YYYY-MM-DD format" });
    }

    const db = req.supabaseClient || getSupabaseClient();

    const { data, error } = await db
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
      entry_count: (data || []).length,
      entries: data,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const db = req.supabaseClient || getSupabaseClient();

    const { data: existing } = await db
      .from("calorie_logs")
      .select("id")
      .eq("id", id)
      .eq("user_id", req.userId!)
      .single();

    if (!existing) {
      return res.status(404).json({ error: "Calorie log not found" });
    }

    const { error } = await db
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
