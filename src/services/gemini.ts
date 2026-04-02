import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function textToSpeech(text: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say cheerfully: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio;
}

export async function inspectRoom(currentImageBase64: string, referenceImageBase64: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: "Compare the 'Current Image' to the 'Reference Image' of a child's room. Determine if the room is clean (at least 85% match in terms of tidiness). If the match is between 70% and 85%, mark it as needing parent review. If not clean, provide 2 simple, encouraging instructions for a 4-year-old." },
          { inlineData: { data: referenceImageBase64, mimeType: "image/jpeg" } },
          { inlineData: { data: currentImageBase64, mimeType: "image/jpeg" } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isClean: { type: Type.BOOLEAN },
          matchPercentage: { type: Type.NUMBER },
          needs_parent_review: { type: Type.BOOLEAN },
          instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
          feedback: { type: Type.STRING },
          internal_note: { type: Type.STRING }
        },
        required: ["isClean", "matchPercentage", "needs_parent_review", "instructions", "feedback"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function inspectPlate(mealImageBase64: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: "Inspect this 'Finished Meal' image. Determine if the plate is empty (ignore crumbs/sauce). If the confidence is between 70% and 85%, mark it as needing parent review. If food remains, describe its location and what it is." },
          { inlineData: { data: mealImageBase64, mimeType: "image/jpeg" } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isEmpty: { type: Type.BOOLEAN },
          confidence: { type: Type.NUMBER },
          needs_parent_review: { type: Type.BOOLEAN },
          remainingFoodDescription: { type: Type.STRING },
          feedback: { type: Type.STRING },
          internal_note: { type: Type.STRING }
        },
        required: ["isEmpty", "needs_parent_review", "remainingFoodDescription", "feedback"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function parseCommand(text: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this command: "${text}". Determine if it is a new Rule creation, a Point Correction (e.g., "Add 5 points"), or an Override. Output the structured intent. For rules, provide a short "task_name" (e.g., "Clean Sweep") and a detailed "action" description.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent: { type: Type.STRING, enum: ["CREATE_RULE", "POINT_CORRECTION", "OVERRIDE"] },
          task_name: { type: Type.STRING },
          action: { type: Type.STRING },
          point_value: { type: Type.INTEGER },
          validation_method: { type: Type.STRING, enum: ["Image", "Timer", "Manual"] },
          emoji: { type: Type.STRING },
          correction_type: { type: Type.STRING, enum: ["ADD", "REMOVE"] }
        },
        required: ["intent"]
      }
    }
  });

  return JSON.parse(response.text);
}
