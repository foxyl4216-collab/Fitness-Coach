import { createAIVisionResponse } from "./openRouter";
import { logAICall } from "../utils/aiLogger";
import type { FoodAnalysisResult } from "./foodVisionAI";

const FOOD_ANALYSIS_SYSTEM = `You are a professional nutritionist with expert knowledge of food portions and calories. Analyze food images carefully and return ONLY valid JSON. Do not include markdown or any text outside the JSON.

Return this exact structure: {"items":[{"name":"","estimated_quantity":"","estimated_calories":0}],"total_estimated_calories":0,"confidence_score":0,"low_confidence":false}

Guidelines:
- Use standard USDA nutritional data for calorie estimates
- Be consistent: same food at same quantity = same calories
- confidence_score: 0-100 based on image clarity
- low_confidence: true only if you cannot clearly identify the food
- total_estimated_calories must be the sum of all item calories
- Return ONLY valid JSON, no markdown`;

const FOOD_ANALYSIS_PROMPT = `Analyze this food image. Identify each distinct food item, estimate the portion size (in standard units like 'medium', 'cups', 'pieces', 'grams'), and calculate calories based on that portion. Return total_estimated_calories as the sum of all items. Set confidence_score based on how clearly you can identify the food and estimate its quantity (0-100).`;

/**
 * Analyze a food image using Gemini Flash vision via OpenRouter.
 * createAIResponse("Analyze food image", "gemini")
 */
export async function analyzeFoodImageGemini(
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg"
): Promise<FoodAnalysisResult> {
  const start = Date.now();
  const base64 = imageBuffer.toString("base64");

  try {
    const raw = await createAIVisionResponse(
      FOOD_ANALYSIS_PROMPT,
      base64,
      mimeType,
      "gemini",
      {
        systemPrompt: FOOD_ANALYSIS_SYSTEM,
        maxTokens: 512,
        temperature: 0,
        maxRetries: 2,
      }
    );

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in Gemini response");

    const parsed = JSON.parse(jsonMatch[0]) as FoodAnalysisResult;

    if (!parsed.items || !Array.isArray(parsed.items)) {
      throw new Error("Invalid response: missing items array");
    }

    if (!parsed.total_estimated_calories || parsed.total_estimated_calories <= 0) {
      parsed.total_estimated_calories = parsed.items.reduce(
        (sum, item) => sum + (item.estimated_calories || 0),
        0
      );
    }

    parsed.confidence_score = Math.max(0, Math.min(100, parsed.confidence_score || 50));
    if (parsed.total_estimated_calories < 10) parsed.low_confidence = true;
    if (parsed.total_estimated_calories > 5000) {
      parsed.total_estimated_calories = 5000;
      parsed.low_confidence = true;
    }

    logAICall({ service: "openrouter-gemini", task: "camera_food", durationMs: Date.now() - start, success: true });
    return parsed;
  } catch (err: any) {
    logAICall({ service: "openrouter-gemini", task: "camera_food", durationMs: Date.now() - start, success: false, error: err.message });
    throw new Error(`Gemini food analysis failed: ${err.message}`);
  }
}
