"use client";

import { GoogleGenAI, type Content } from "@google/genai";
import { GeminiResponse, DEFAULT_TARGETS, buildUserProfile } from "@/lib/types";

function buildSystemInstruction(): string {
  const userProfile = buildUserProfile(DEFAULT_TARGETS);
  return `Tu es un parseur nutritionnel. ${userProfile}

RÈGLES ABSOLUES :
- Tu DOIS TOUJOURS répondre UNIQUEMENT par un JSON valide, sans aucun autre texte.
- MÊME SI l'input est invalide, incompréhensible ou vide, retourne quand même le JSON avec des estimations ou "Non identifié".
- JAMAIS de texte avant ou après le JSON. JAMAIS d'explications.
- Estime les portions pour un athlète de 90kg+ (NE SOUS-ESTIME PAS les protéines).
- Si le repas contient des courgettes ou champignons, mentionne-le dans "analysis" avec ⚠️.

Format de réponse OBLIGATOIRE (pas de markdown, pas de backticks) :
{"food":"nom court du plat","calories":0,"protein":0,"carbs":0,"fat":0,"analysis":"analyse courte max 80 chars"}`;
}

const SYSTEM_INSTRUCTION = buildSystemInstruction();

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_TEXT_LENGTH = 500;

export const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });

function validateImageInput(imageBase64?: string): void {
  if (!imageBase64) return;
  const byteSize = Math.ceil(imageBase64.length * 0.75);
  if (byteSize > MAX_IMAGE_BYTES) {
    throw new Error("Image trop volumineuse (max 4 Mo).");
  }
}

function validateTextInput(text: string): void {
  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(`Texte trop long (max ${MAX_TEXT_LENGTH} caractères).`);
  }
}

export async function analyzeFood(
  text: string,
  imageBase64?: string,
  imageMime?: string
): Promise<GeminiResponse> {
  validateImageInput(imageBase64);
  validateTextInput(text);

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
    responseMimeType: "application/json",
  };

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts }],
    config,
  });

  const response = result.text ?? "";
  return parseGeminiResponse(response);
}

export async function refineFood(
  existing: GeminiResponse,
  correction: string
): Promise<GeminiResponse> {
  validateTextInput(correction);

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

export async function chatWithCoach(
  contents: Array<{ role: string; parts: Array<{ text: string }> }>
): Promise<string> {
  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: contents as Content[],
    config: {
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  return result.text ?? "";
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
