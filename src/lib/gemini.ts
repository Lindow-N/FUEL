"use client";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiResponse } from "@/lib/types";

const SYSTEM_PROMPT = `Tu es un assistant nutritionnel ultra-précis. L'utilisateur va te décrire un repas ou t'envoyer une photo de nourriture.

Tu dois retourner UNIQUEMENT un JSON valide avec cette structure exacte, sans texte additionnel :
{
  "food": "nom court du plat en français",
  "calories": nombre entier en kcal,
  "protein": nombre en grammes (décimal possible),
  "carbs": nombre en grammes (décimal possible),
  "fat": nombre en grammes (décimal possible),
  "analysis": "analyse courte en français (max 80 caractères) de la qualité nutritionnelle"
}

Sois réaliste dans les estimations. Si c'est une image, identifie les aliments visibles et estime les portions.`;

export async function analyzeFood(
  text: string,
  imageBase64?: string
): Promise<GeminiResponse> {
  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  > = [];

  parts.push({ text: SYSTEM_PROMPT });

  if (imageBase64) {
    parts.push({
      inlineData: { mimeType: "image/jpeg", data: imageBase64 },
    });
  }

  parts.push({
    text: text
      ? `Description du repas : ${text}`
      : "Analyse cette image et identifie les aliments.",
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
  });
  const response = result.response.text();

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Impossible de parser la réponse IA");

  return JSON.parse(jsonMatch[0]);
}
