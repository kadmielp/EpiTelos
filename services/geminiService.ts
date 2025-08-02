
import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODELS } from "../constants";

// Adapt to different environments: Vite uses import.meta.env, Tauri/Node use process.env
const apiKey = typeof process !== 'undefined' && process.env?.API_KEY
  ? process.env.API_KEY
  : import.meta.env?.VITE_API_KEY;

if (!apiKey) {
  console.error("API key is not configured. Please set API_KEY or VITE_API_KEY in your environment.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

interface RunAIOptions {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  // signal is included for API consistency, but the Gemini SDK does not support AbortSignal.
  // Cancellation for streams is handled in the application's stream processing loop.
  // Non-streaming calls cannot be cancelled mid-flight.
  signal?: AbortSignal;
}

export const runAIFunction = async ({ systemPrompt, userPrompt, model }: RunAIOptions): Promise<string> => {
  if (!apiKey) {
    return Promise.reject(new Error("Gemini API key is not configured."));
  }
  
  try {
    const fullPrompt = `${userPrompt}`;
    const response = await ai.models.generateContent({
      model: model,
      contents: fullPrompt,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        return `An error occurred while communicating with the Gemini API: ${error.message}`;
    }
    return "An unknown error occurred while communicating with the Gemini API.";
  }
};

export async function* runAIFunctionStream({ systemPrompt, userPrompt, model }: RunAIOptions): AsyncGenerator<string> {
  if (!apiKey) {
    throw new Error("Gemini API key is not configured.");
  }
  
  const fullPrompt = `${userPrompt}`;
  const stream = await ai.models.generateContentStream({
    model: model,
    contents: fullPrompt,
    config: {
      systemInstruction: systemPrompt,
    },
  });

  for await (const chunk of stream) {
    yield chunk.text;
  }
}

export const verifyConnection = async (): Promise<{ success: boolean; message: string }> => {
  if (!apiKey) {
    return { success: false, message: "Gemini API key not found in environment." };
  }
  return { success: true, message: "Gemini API key is configured." };
};

export const getModels = async (): Promise<string[]> => {
    // For Gemini, models are currently a static list.
    return Promise.resolve(GEMINI_MODELS);
};