import { GoogleGenAI, Type } from "@google/genai";
import { Language } from "../types";
import { TRANSLATIONS } from "../translations";

// Initialize Gemini
// NOTE: We assume process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export interface GeneratedEvent {
  title: string;
  description: string;
  moneyChange: number; // Positive for gain, negative for loss
}

export const generateChanceEvent = async (lang: Language): Promise<GeneratedEvent> => {
  if (!process.env.API_KEY) {
    const t = TRANSLATIONS[lang];
    // Fallback if no API key
    return {
      title: t.modals.chanceTitle,
      description: "You found a coin!",
      moneyChange: 100
    };
  }

  const promptSuffix = TRANSLATIONS[lang].promptLang;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a fun, kid-friendly random event for a Monopoly-like board game. It should either give the player money or make them lose money. Keep it short. ${promptSuffix}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A short catchy title (max 5 words)" },
            description: { type: Type.STRING, description: "One sentence description of what happened." },
            moneyChange: { type: Type.INTEGER, description: "Amount of money changed. Range -500 to +500." }
          },
          required: ["title", "description", "moneyChange"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as GeneratedEvent;
    }
    throw new Error("No response text");
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      title: "Lucky!",
      description: "...",
      moneyChange: 100
    };
  }
};

export const generateCommentary = async (playerName: string, action: string, lang: Language, amount?: number): Promise<string> => {
  if (!process.env.API_KEY) return `Wow! ${playerName} ${action}!`;

  const promptSuffix = TRANSLATIONS[lang].promptLang;

  try {
    const prompt = `Write a very short, funny, 1-sentence reaction from an enthusiastic game show host about ${playerName} who just ${action} ${amount ? `(${amount})` : ''}. Use emojis. ${promptSuffix}`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        maxOutputTokens: 60
      }
    });
    return response.text || "Amazing!";
  } catch (e) {
    return "Wow!";
  }
};