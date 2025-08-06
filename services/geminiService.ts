
import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODELS } from "../constants";

// Adapt to different environments: Vite uses import.meta.env, Tauri/Node use process.env
const fallbackApiKey = typeof process !== 'undefined' && process.env?.API_KEY
  ? process.env.API_KEY
  : import.meta.env?.VITE_API_KEY;

interface RunAIOptions {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  apiKey?: string;
  // signal is included for API consistency, but the Gemini SDK does not support AbortSignal.
  // Cancellation for streams is handled in the application's stream processing loop.
  // Non-streaming calls cannot be cancelled mid-flight.
  signal?: AbortSignal;
}

export const runAIFunction = async ({ systemPrompt, userPrompt, model, apiKey }: RunAIOptions): Promise<string> => {
  const finalApiKey = apiKey || fallbackApiKey;
  
  if (!finalApiKey) {
    return Promise.reject(new Error("Gemini API key is not configured."));
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey: finalApiKey });
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

export async function* runAIFunctionStream({ systemPrompt, userPrompt, model, apiKey }: RunAIOptions): AsyncGenerator<string> {
  const finalApiKey = apiKey || fallbackApiKey;
  
  if (!finalApiKey) {
    throw new Error("Gemini API key is not configured.");
  }
  
  const ai = new GoogleGenAI({ apiKey: finalApiKey });
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

export const verifyConnection = async (apiKey?: string): Promise<{ success: boolean; message: string }> => {
  const finalApiKey = apiKey || fallbackApiKey;
  
  if (!finalApiKey) {
    return { success: false, message: "Gemini API key is not configured." };
  }
  
  try {
    // Test the API key by making a minimal request
    const ai = new GoogleGenAI({ apiKey: finalApiKey });
    await ai.models.generateContent({
      model: GEMINI_MODELS[0],
      contents: "Hello",
      config: {
        systemInstruction: "Reply with just 'Hi'",
      },
    });
    
    return { success: true, message: "Gemini API connection verified successfully." };
  } catch (error) {
    console.error("Error verifying Gemini API:", error);
    return { success: false, message: "Invalid Gemini API key or connection failed." };
  }
};

export const getModels = async (): Promise<string[]> => {
    // For Gemini, models are currently a static list.
    return Promise.resolve(GEMINI_MODELS);
};