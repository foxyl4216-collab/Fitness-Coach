import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseClient } from "../config/supabase";

const router = Router();

const VALID_ENERGY_LEVELS = ["low", "moderate", "high"];

router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { week_number, weight, adherence_percent, energy_level, waist_measurement } = req.body;

    if (!week_number || typeof week_number !== "number" || week_number < 1) {
      return res.status(400).json({ error: "week_number must be a positive integer" });
    }

    if (weight !== undefined && (typeof weight !== "number" || weight <= 0)) {
      return res.status(400).json({ error: "Weight must be a positive number" });
    }

    if (adherence_percent !== undefined) {
      if (typeof adherence_percent !== "number" || adherence_percent < 0 || adherence_percent > 100) {
        return res.status(400).json({ error: "adherence_percent must be between 0 and 100" });
      }
    }

    if (energy_level && !VALID_ENERGY_LEVELS.includes(energy_level)) {
      return res.status(400).json({ error: `energy_level must be one of: ${VALID_ENERGY_LEVELS.join(", ")}` });
    }

    if (waist_measurement !== undefined && (typeof waist_measurement !== "number" || waist_measurement <= 0)) {
      return res.status(400).json({ error: "waist_measurement must be a positive number" });
    }

    const db = req.supabaseClient || getSupabaseClient();

    const { data, error } = await db
      .from("weekly_checkins")
      .insert({
        user_id: req.userId!,
        week_number,
        weight,
        adherence_percent,
        energy_level,
        waist_measurement,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ message: "Check-in recorded", checkin: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const db = req.supabaseClient || getSupabaseClient();

    const { data, error } = await db
      .from("weekly_checkins")
      .select("*")
      .eq("user_id", req.userId!)
      .order("week_number", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ checkins: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.get("/latest", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const db = req.supabaseClient || getSupabaseClient();

    const { data, error } = await db
      .from("weekly_checkins")
      .select("*")
      .eq("user_id", req.userId!)
      .order("week_number", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "No check-ins found" });
    }

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ checkin: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

export default router;
