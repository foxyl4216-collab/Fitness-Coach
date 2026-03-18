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
  const base64 = imageBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a professional nutritionist. Analyze food images and return ONLY valid JSON with this exact structure: {"items":[{"name":"","estimated_quantity":"","estimated_calories":0}],"total_estimated_calories":0,"confidence_score":0,"low_confidence":false}. confidence_score is 0-100. Set low_confidence:true if image is unclear or not food.`,
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
            text: "Identify each food item, estimate portion size and calories. Return total_estimated_calories as sum of all items. Set confidence_score based on image clarity and food visibility (0-100).",
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI vision service");
  }

  const result = JSON.parse(content) as FoodAnalysisResult;

  if (!result.items || !Array.isArray(result.items)) {
    throw new Error("Invalid AI response format");
  }

  // Ensure total is calculated if missing
  if (!result.total_estimated_calories || result.total_estimated_calories <= 0) {
    result.total_estimated_calories = result.items.reduce(
      (sum, item) => sum + (item.estimated_calories || 0),
      0
    );
  }

  return result;
}
