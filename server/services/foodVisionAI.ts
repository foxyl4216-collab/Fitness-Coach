import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface FoodItem {
  name: string;
  estimated_quantity: string;
  estimated_calories: number;
}

export interface FoodAnalysisResult {
  items: FoodItem[];
  total_estimated_calories: number;
  confidence_score: number;
  low_confidence: boolean;
}

export async function analyzeFoodImage(imageBuffer: Buffer, mimeType: string = "image/jpeg"): Promise<FoodAnalysisResult> {
  console.log("[foodVisionAI] Buffer size:", imageBuffer.length, "bytes");
  
  const base64 = imageBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  console.log("[foodVisionAI] Calling OpenAI GPT-4o Vision...");
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a professional nutritionist. Analyze food images and return ONLY valid JSON. Do not include markdown or any text outside the JSON. Return this exact structure: {"items":[{"name":"","estimated_quantity":"","estimated_calories":0}],"total_estimated_calories":0,"confidence_score":0,"low_confidence":false}. Set confidence_score 0-100 and low_confidence:true if unclear.`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: dataUrl, detail: "low" },
          },
          {
            type: "text",
            text: "Identify each food item, estimate portion size and calories per item. Return total_estimated_calories as the sum. Set confidence_score based on image clarity (0-100).",
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content || content.trim().length === 0) {
    throw new Error("Empty response from AI vision service");
  }

  console.log("[foodVisionAI] Raw AI response:", content);

  let result: FoodAnalysisResult;
  try {
    result = JSON.parse(content) as FoodAnalysisResult;
  } catch (e) {
    console.error("[foodVisionAI] JSON parse error:", e);
    throw new Error("AI response was not valid JSON");
  }

  if (!result.items || !Array.isArray(result.items)) {
    throw new Error("Invalid AI response format: missing items array");
  }

  // Ensure total is calculated if missing
  if (!result.total_estimated_calories || result.total_estimated_calories <= 0) {
    result.total_estimated_calories = result.items.reduce(
      (sum, item) => sum + (item.estimated_calories || 0),
      0
    );
  }

  console.log("[foodVisionAI] Parsed result:", JSON.stringify(result, null, 2));
  return result;
}
