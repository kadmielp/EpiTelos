

interface OllamaRequest {
  model: string;
  prompt: string;
  system: string;
  stream: boolean;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

interface OllamaTagsResponse {
    models: {
        name: string;
        modified_at: string;
        size: number;
    }[];
}

interface RunOllamaOptions {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  apiUrl: string;
  signal?: AbortSignal;
}

export const runOllamaFunction = async ({ systemPrompt, userPrompt, model, apiUrl, signal }: RunOllamaOptions): Promise<string> => {
  if (!apiUrl) {
    return Promise.reject(new Error("Ollama API URL is not configured."));
  }

  try {
    const response = await fetch(`${apiUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: userPrompt,
        system: systemPrompt,
        stream: false, // For simplicity, we are not using streaming here
      } as OllamaRequest),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Ollama API request failed with status ${response.status}: ${errorBody}`);
    }

    const data: OllamaResponse = await response.json();
    return data.response;
  } catch (error) {
    console.error("Error calling Ollama API:", error);
    if (error instanceof Error) {
        // Provide more specific feedback for common network errors
        if (error.message.includes('Failed to fetch')) {
             return `Connection to Ollama failed. Please ensure Ollama is running and the API URL is correct (currently: ${apiUrl}).`;
        }
        return `An error occurred while communicating with the Ollama API: ${error.message}`;
    }
    return "An unknown error occurred while communicating with the Ollama API.";
  }
};

export async function* runOllamaFunctionStream({ systemPrompt, userPrompt, model, apiUrl, signal }: RunOllamaOptions): AsyncGenerator<string> {
    if (!apiUrl) {
        throw new Error("Ollama API URL is not configured.");
    }

    const response = await fetch(`${apiUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: userPrompt,
        system: systemPrompt,
        stream: true,
      }),
      signal,
    });

    if (!response.ok || !response.body) {
      const errorBody = await response.text();
      throw new Error(`Ollama API request failed with status ${response.status}: ${errorBody}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          // Ollama streams JSON objects separated by newlines
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          for (const line of lines) {
            try {
                const data: OllamaResponse = JSON.parse(line);
                if (data.response) {
                  yield data.response;
                }
                if (data.done) return;
            } catch (e) {
                console.error("Failed to parse Ollama stream chunk:", line);
            }
          }
        }
    } finally {
        reader.releaseLock();
    }
}


export const verifyConnection = async (apiUrl: string): Promise<{ success: boolean; message: string }> => {
  if (!apiUrl) {
      return { success: false, message: "Ollama API URL is missing." };
  }

  try {
      const response = await fetch(apiUrl, { method: 'GET' });

      if (!response.ok) {
          throw new Error(`Server responded with status ${response.status}`);
      }
      
      const text = await response.text();
      if (!text.includes("Ollama is running")) {
          throw new Error("Did not receive the expected 'Ollama is running' response.");
      }
      
      return { success: true, message: "Ollama connection successful." };

  } catch (error) {
      console.error("Ollama connection verification failed:", error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
          return { success: false, message: "Connection failed. Is Ollama running?" };
      }
      return { success: false, message: "Could not connect to the Ollama API URL." };
  }
};

export const getModels = async (apiUrl: string): Promise<string[]> => {
    if (!apiUrl) {
        return Promise.reject(new Error("Ollama API URL is not configured."));
    }

    try {
        const response = await fetch(`${apiUrl}/api/tags`);
        if (!response.ok) {
            throw new Error(`Failed to fetch models with status ${response.status}`);
        }
        const data: OllamaTagsResponse = await response.json();
        if (!data.models || data.models.length === 0) {
            return [];
        }
        return data.models.map(m => m.name).sort();
    } catch (error) {
        console.error("Failed to get Ollama models:", error);
        throw new Error("Could not retrieve models from Ollama. Please ensure it's running and the API URL is correct.");
    }
};