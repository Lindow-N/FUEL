"use client";

import { GoogleGenAI, type Content } from "@google/genai";
import { GeminiResponse, USER_PROFILE } from "@/lib/types";

const SYSTEM_INSTRUCTION = `Tu es un parseur nutritionnel. ${USER_PROFILE}

RÈGLES ABSOLUES :
- Tu DOIS TOUJOURS répondre UNIQUEMENT par un JSON valide, sans aucun autre texte.
- MÊME SI l'input est invalide, incompréhensible ou vide, retourne quand même le JSON avec des estimations ou "Non identifié".
- JAMAIS de texte avant ou après le JSON. JAMAIS d'explications.
- Estime les portions pour un athlète de 90kg+ (NE SOUS-ESTIME PAS les protéines).
- Si le repas contient des courgettes ou champignons, mentionne-le dans "analysis" avec ⚠️.

Format de réponse OBLIGATOIRE (pas de markdown, pas de backticks) :
{"food":"nom court du plat","calories":0,"protein":0,"carbs":0,"fat":0,"analysis":"analyse courte max 80 chars"}`;

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });

export async function analyzeFood(
  text: string,
  imageBase64?: string,
  imageMime?: string
): Promise<GeminiResponse> {
  const parts: Content["parts"] = [];

  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: imageMime || "image/jpeg",
        data: imageBase64,
      },
    });
  }

  parts.push({
    text: text
      ? `Repas à analyser : ${text}`
      : "Analyse cette image, identifie les aliments et estime les portions.",
  });

  const config: Record<string, unknown> = {
    systemInstruction: SYSTEM_INSTRUCTION,
    thinkingConfig: { thinkingBudget: 0 },
  };

  if (!imageBase64) {
    config.responseMimeType = "application/json";
  }

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts }],
    config,
  });

  const response = result.text ?? "";
  return parseGeminiResponse(response);
}

export async function refineFood(
  existing: { food: string; calories: number; protein: number; carbs: number; fat: number; analysis: string },
  correction: string
): Promise<GeminiResponse> {
  const parts: Content["parts"] = [];
  parts.push({
    text: `Repas existant à corriger :
- Nom : ${existing.food}
- Calories : ${existing.calories}
- Protéines : ${existing.protein}g
- Glucides : ${existing.carbs}g
- Lipides : ${existing.fat}g
- Analyse : ${existing.analysis}

Correction de l'utilisateur : ${correction}

Recalcule les valeurs nutritionnelles en tenant compte de cette correction.`,
  });

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
    },
  });

  const response = result.text ?? "";
  return parseGeminiResponse(response);
}

function parseGeminiResponse(response: string): GeminiResponse {
  try {
    return JSON.parse(response);
  } catch {
    const cleaned = response
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[FUEL] No JSON in response:", response);
      throw new Error("Impossible de parser la réponse IA");
    }
    return JSON.parse(jsonMatch[0]);
  }
}
