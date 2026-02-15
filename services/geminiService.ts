import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Language } from "../types";
import { TRANSLATIONS } from "../translations";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export interface GeneratedEvent {
  title: string;
  description: string;
  moneyChange: number;
}

export const generateChanceEvent = async (lang: Language): Promise<GeneratedEvent> => {
  if (!process.env.API_KEY) {
    const t = TRANSLATIONS[lang];
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
    console.error("Gemini API Error (Event):", error);
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
    console.error("Gemini API Error (Commentary):", e);
    return "Wow!";
  }
};

export const generateSpeech = async (text: string, voice: string = 'Kore'): Promise<Uint8Array | null> => {
  if (!process.env.API_KEY) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return decode(base64Audio);
    }
  } catch (e: any) {
    // Handle 429 Quota errors specifically to return quickly
    if (e.message?.includes("429") || e.status === 429) {
      console.warn("Gemini TTS Quota exceeded (429). Falling back.");
    } else {
      console.error("TTS Error:", e);
    }
  }
  return null;
};

// --- Audio Decoding Helpers ---

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
