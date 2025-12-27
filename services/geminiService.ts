import { GoogleGenAI } from "@google/genai";

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
    // Check key by simply listing models (cheaper/no generation quota used)
    const ai = new GoogleGenAI({ apiKey: finalApiKey });
    const result = await ai.models.list();

    if (result) {
      return { success: true, message: "Gemini API connection verified successfully." };
    }
    return { success: false, message: "No models available for this API key." };
  } catch (error) {
    console.error("Error verifying Gemini API:", error);
    // Check specifically for 429 to give a better message
    if (error instanceof Error && error.message.includes('429')) {
      return { success: false, message: "Gemini Quota Exceeded (429). Please wait a moment or check your plan." };
    }
    return { success: false, message: "Invalid Gemini API key or connection failed." };
  }
};

export const getModels = async (apiKey?: string): Promise<string[]> => {
  const finalApiKey = apiKey || fallbackApiKey;

  if (!finalApiKey) {
    return [];
  }

  try {
    const ai = new GoogleGenAI({ apiKey: finalApiKey });
    const result = await ai.models.list();
    const models: string[] = [];

    try {
      // Try async iteration first (SDK standard)
      for await (const model of result) {
        if (model.name) {
          const cleanName = model.name.replace('models/', '');
          if (cleanName.toLowerCase().startsWith('gemini')) {
            models.push(cleanName);
          }
        }
      }
    } catch (iterError) {
      console.warn("Async iteration failed, trying direct property access:", iterError);
      // Fallback: check if it has a direct models array (common in some SDK versions)
      const anyResult = result as any;
      const staticModels = anyResult.models || anyResult.data || [];
      if (Array.isArray(staticModels)) {
        staticModels.forEach((m: any) => {
          const name = m.name || m.id;
          if (name) {
            const cleanName = name.replace('models/', '');
            if (cleanName.toLowerCase().startsWith('gemini')) {
              models.push(cleanName);
            }
          }
        });
      }
    }

    if (models.length === 0) {
      console.warn("No Gemini models found in API response, using fallbacks.");
      return ['gemini-3-flash-preview'];
    }

    return models.sort();
  } catch (error) {
    console.error("Failed to get Gemini models:", error);
    // Return fallbacks so the user isn't stuck with an empty list
    return ['gemini-3-flash-preview'];
  }
};