import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseClient } from "../config/supabase";
import { uploadImage } from "../middleware/upload";
import { analyzeFoodImage } from "../services/foodVisionAI";

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

router.post("/scan", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      console.log("📸 Route hit: /api/calorie-log/scan");
      
      const { image_base64, mime_type } = req.body;
      
      if (!image_base64) {
        return res.status(400).json({
          success: false,
          error: "No image provided. Please include image_base64 in request body.",
        });
      }

      console.log("📸 Image received, size:", image_base64.length);
      console.log("📸 User:", req.userId);

      const db = req.supabaseClient || getSupabaseClient();
      const today = new Date().toISOString().split("T")[0];

      // Rate limit: max 10 AI scans per day per user
      const { count } = await db
        .from("calorie_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", req.userId!)
        .eq("date", today)
        .eq("source", "camera");

      console.log("📸 Today's scan count:", count);
      if ((count || 0) >= 10) {
        return res.status(429).json({
          success: false,
          error: "Daily scan limit reached (10 scans per day).",
        });
      }

      // Run AI food vision analysis
      console.log("📸 Sending to AI vision service...");
      let analysis;
      try {
        const imageBuffer = Buffer.from(image_base64, "base64");
        const mimeType = mime_type || "image/jpeg";
        analysis = await analyzeFoodImage(imageBuffer, mimeType);
        console.log("📸 AI RESULT:", JSON.stringify(analysis, null, 2));
      } catch (aiErr: any) {
        console.error("📸 AI analysis failed:", aiErr.message);
        return res.status(502).json({
          success: false,
          error: `AI analysis failed: ${aiErr.message}`,
        });
      }

      // Validate result quality
      if (
        !analysis ||
        analysis.low_confidence ||
        analysis.confidence_score < 60 ||
        !analysis.total_estimated_calories ||
        analysis.total_estimated_calories <= 0
      ) {
        console.log("📸 Image quality check failed:", {
          low_confidence: analysis?.low_confidence,
          confidence: analysis?.confidence_score,
          calories: analysis?.total_estimated_calories,
        });
        return res.status(422).json({
          success: false,
          message: "Image unclear or not food. Please retake photo.",
          confidence_score: analysis?.confidence_score || 0,
        });
      }

      // Build food name summary from detected items
      const foodName = analysis.items?.length > 0
        ? analysis.items.map((i: any) => i.name).join(", ").substring(0, 100)
        : "AI Scan";

      console.log("📸 Saving to Supabase:", {
        foodName,
        calories: analysis.total_estimated_calories,
      });

      // Save to Supabase — try with analysis_json, fall back without it
      let savedLog: any = null;
      let insertError: any = null;

      const { data: withJson, error: errWithJson } = await db
        .from("calorie_logs")
        .insert({
          user_id: req.userId!,
          date: today,
          food_name: foodName,
          calories: Math.round(analysis.total_estimated_calories),
          source: "camera",
          confidence: Math.min(1, analysis.confidence_score / 100),
          analysis_json: analysis,
        })
        .select()
        .single();

      if (errWithJson) {
        console.warn(
          "📸 Retrying without analysis_json column:",
          errWithJson.message
        );
        // analysis_json column may not exist yet — retry without it
        const { data: withoutJson, error: errWithoutJson } = await db
          .from("calorie_logs")
          .insert({
            user_id: req.userId!,
            date: today,
            food_name: foodName,
            calories: Math.round(analysis.total_estimated_calories),
            source: "camera",
            confidence: Math.min(1, analysis.confidence_score / 100),
          })
          .select()
          .single();
        savedLog = withoutJson;
        insertError = errWithoutJson;
      } else {
        savedLog = withJson;
      }

      if (insertError) {
        console.error("📸 Database error:", insertError.message);
        return res.status(500).json({
          success: false,
          error: insertError.message,
        });
      }

      console.log("📸 Success! Log saved:", savedLog?.id);
      return res.status(201).json({
        success: true,
        message: "Food scanned and logged successfully",
        log: savedLog,
        analysis: {
          items: analysis.items,
          total_estimated_calories: Math.round(
            analysis.total_estimated_calories
          ),
          confidence_score: analysis.confidence_score,
        },
      });
    } catch (err: any) {
      console.error("📸 Route error:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Internal server error",
      });
    }
  }
);

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
