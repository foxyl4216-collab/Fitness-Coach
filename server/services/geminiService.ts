import { GoogleGenerativeAI } from "@google/generative-ai";
import { logAICall } from "../utils/aiLogger";
import type { FoodAnalysisResult } from "./foodVisionAI";

function getGeminiClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenerativeAI(key);
}

export async function analyzeFoodImageGemini(
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg"
): Promise<FoodAnalysisResult> {
  const start = Date.now();

  const prompt = `Analyze this food image. Return ONLY valid JSON with this exact structure:
{"items":[{"name":"","estimated_quantity":"","estimated_calories":0}],"total_estimated_calories":0,"confidence_score":0,"low_confidence":false}

Rules:
- Use USDA nutritional data for calorie estimates
- Be consistent: same food at same quantity = same calories
- confidence_score: 0-100 (image clarity and identification certainty)
- low_confidence: true only if you cannot clearly identify the food
- total_estimated_calories: sum of all item calories
- Return ONLY the JSON object, no markdown, no extra text`;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const imagePart = {
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType,
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const text = result.response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in Gemini response");

      const parsed = JSON.parse(jsonMatch[0]) as FoodAnalysisResult;

      if (!parsed.items || !Array.isArray(parsed.items)) {
        throw new Error("Invalid Gemini response: missing items array");
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

      logAICall({ service: "gemini", task: "camera_food", durationMs: Date.now() - start, success: true });
      return parsed;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini] Attempt ${attempt} failed:`, err.message);
      if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
    }
  }

  logAICall({ service: "gemini", task: "camera_food", durationMs: Date.now() - start, success: false, error: lastError?.message });
  throw new Error(`Gemini food analysis failed: ${lastError?.message}`);
}
