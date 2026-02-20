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
  const prompts = {
    zh: "生成一个有趣的、适合儿童的、类似大富翁游戏的随机事件。它应该给玩家钱或让玩家赔钱。保持简短。",
    en: "Generate a fun, kid-friendly random event for a Monopoly-like board game. It should either give the player money or make them lose money. Keep it short.",
    de: "Generiere ein lustiges, kinderfreundliches Zufallsereignis für ein Monopoly-ähnliches Brettspiel. Es sollte dem Spieler entweder Geld geben oder ihn Geld verlieren lassen. Halte es kurz.",
    ja: "モノポリーのようなボードゲームのために、楽しくて子供向けのランダムなイベントを生成してください。プレイヤーにお金を与えるか、お金を失わせるかのどちらかにしてください。短くしてください。"
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompts[lang] || prompts.en,
      config: {
        systemInstruction: `You are a creative game designer. ${promptSuffix} Always respond in the requested language.`,
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
    const t = TRANSLATIONS[lang];
    return {
      title: t.modals.chanceTitle,
      description: lang === 'zh' ? "你发现了一枚金币！" : lang === 'ja' ? "コインを見つけた！" : lang === 'de' ? "Du hast eine Münze gefunden!" : "You found a coin!",
      moneyChange: 100
    };
  }
};

export const generateCommentary = async (playerName: string, action: string, lang: Language, amount?: number): Promise<string> => {
  if (!process.env.API_KEY) return `Wow! ${playerName} ${action}!`;

  const promptSuffix = TRANSLATIONS[lang].promptLang;
  const prompts = {
    zh: `写一个非常简短、有趣、只有一句话的反应，来自一个热情的游戏节目主持人，关于 ${playerName} 刚刚 ${action} ${amount ? `(${amount})` : ''}。使用表情符号。`,
    en: `Write a very short, funny, 1-sentence reaction from an enthusiastic game show host about ${playerName} who just ${action} ${amount ? `(${amount})` : ''}. Use emojis.`,
    de: `Schreibe eine sehr kurze, lustige, einseitige Reaktion von einem enthusiastischen Spielshow-Moderator über ${playerName}, der gerade ${action} ${amount ? `(${amount})` : ''} hat. Benutze Emojis.`,
    ja: `熱狂的なゲーム番組の司会者による、${playerName} が ${action} ${amount ? `(${amount})` : ''} したことに対する、非常に短く面白い1文のリアクションを書いてください。絵文字を使用してください。`
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompts[lang] || prompts.en,
      config: {
        systemInstruction: `You are an enthusiastic game show host. ${promptSuffix} Always respond in the requested language. Keep it under 20 words.`,
        maxOutputTokens: 150
      }
    });
    return response.text?.trim() || "Amazing!";
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
