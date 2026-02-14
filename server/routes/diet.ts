import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseClient } from "../config/supabase";

const router = Router();

router.post("/create", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { week_number, calorie_target, protein_target, diet_json } = req.body;

    if (!week_number || typeof week_number !== "number" || week_number < 1) {
      return res.status(400).json({ error: "week_number must be an integer >= 1" });
    }

    if (calorie_target !== undefined && (typeof calorie_target !== "number" || calorie_target < 0)) {
      return res.status(400).json({ error: "calorie_target must be a non-negative number" });
    }

    if (protein_target !== undefined && (typeof protein_target !== "number" || protein_target < 0)) {
      return res.status(400).json({ error: "protein_target must be a non-negative number" });
    }

    const db = req.supabaseClient || getSupabaseClient();

    const { data: existing } = await db
      .from("diet_plans")
      .select("id")
      .eq("user_id", req.userId!)
      .eq("week_number", week_number)
      .single();

    if (existing) {
      const { data, error } = await db
        .from("diet_plans")
        .update({
          calorie_target,
          protein_target,
          diet_json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ message: "Diet plan updated", diet_plan: data });
    }

    const { data, error } = await db
      .from("diet_plans")
      .insert({
        user_id: req.userId!,
        week_number,
        calorie_target,
        protein_target,
        diet_json,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ message: "Diet plan created", diet_plan: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.get("/current", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const db = req.supabaseClient || getSupabaseClient();

    const { data, error } = await db
      .from("diet_plans")
      .select("*")
      .eq("user_id", req.userId!)
      .order("week_number", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "No diet plan found" });
    }

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ diet_plan: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

export default router;
