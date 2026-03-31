import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { supabase, supabaseAdmin, getSupabaseClient } from "../config/supabase";

const router = Router();

const VALID_GOAL_TYPES = ["fat_loss", "muscle_gain", "reduce_belly_fat", "glute_growth"];
const VALID_EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"];
const VALID_DIET_PREFERENCES = ["standard", "vegetarian", "vegan", "keto", "paleo", "mediterranean"];
const VALID_EQUIPMENT_ACCESS = ["none", "minimal", "full_gym"];

router.post("/create", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      age, height, weight, goal_type, focus_track,
      experience_level, diet_preference, equipment_access,
      weekly_availability,
    } = req.body;

    if (!age || !height || !weight || !goal_type) {
      return res.status(400).json({ error: "Missing required fields: age, height, weight, goal_type" });
    }

    if (typeof weight !== "number" || weight <= 0) {
      return res.status(400).json({ error: "Weight must be a positive number" });
    }

    if (typeof age !== "number" || age < 10 || age > 120) {
      return res.status(400).json({ error: "Age must be between 10 and 120" });
    }

    if (!VALID_GOAL_TYPES.includes(goal_type)) {
      return res.status(400).json({ error: `goal_type must be one of: ${VALID_GOAL_TYPES.join(", ")}` });
    }

    if (experience_level && !VALID_EXPERIENCE_LEVELS.includes(experience_level)) {
      return res.status(400).json({ error: `experience_level must be one of: ${VALID_EXPERIENCE_LEVELS.join(", ")}` });
    }

    if (diet_preference && !VALID_DIET_PREFERENCES.includes(diet_preference)) {
      return res.status(400).json({ error: `diet_preference must be one of: ${VALID_DIET_PREFERENCES.join(", ")}` });
    }

    if (equipment_access && !VALID_EQUIPMENT_ACCESS.includes(equipment_access)) {
      return res.status(400).json({ error: `equipment_access must be one of: ${VALID_EQUIPMENT_ACCESS.join(", ")}` });
    }

    const userDb = req.supabaseClient || getSupabaseClient();

    let existing: any = null;
    const { data: userExisting } = await userDb
      .from("user_profiles")
      .select("id")
      .eq("user_id", req.userId!)
      .single();
    if (userExisting) {
      existing = userExisting;
    } else {
      const { data: adminExisting } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", req.userId!)
        .single();
      existing = adminExisting;
    }

    const writeDb = supabaseAdmin || userDb;

    if (existing) {
      const { data, error } = await writeDb
        .from("user_profiles")
        .update({
          age, height, weight, goal_type, focus_track,
          experience_level, diet_preference, equipment_access,
          weekly_availability,
        })
        .eq("user_id", req.userId!)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ message: "Profile updated", profile: data });
    }

    const { data, error } = await writeDb
      .from("user_profiles")
      .insert({
        user_id: req.userId!,
        age, height, weight, goal_type, focus_track,
        experience_level, diet_preference, equipment_access,
        weekly_availability,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ message: "Profile created", profile: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userDb = req.supabaseClient || getSupabaseClient();

    const { data, error } = await userDb
      .from("user_profiles")
      .select("*")
      .eq("user_id", req.userId!)
      .single();

    if (data && !error) {
      return res.json({ profile: data });
    }

    const adminDb = supabaseAdmin || supabase;
    const { data: adminData, error: adminError } = await adminDb
      .from("user_profiles")
      .select("*")
      .eq("user_id", req.userId!)
      .single();

    if (adminError && adminError.code === "PGRST116") {
      return res.status(404).json({ error: "Profile not found" });
    }

    if (adminError) return res.status(500).json({ error: adminError.message });
    return res.json({ profile: adminData });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

export default router;
