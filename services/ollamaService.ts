

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
    const requestUrl = `${apiUrl}/api/generate`;
    const requestBody = {
      model: model,
      prompt: userPrompt,
      system: systemPrompt,
      stream: false,
    } as OllamaRequest;

    // @ts-ignore
    if (window.__TAURI__) {
      console.log("🦀 Using Tauri HTTP client for Ollama generation");
      // @ts-ignore
      const { fetch: tauriFetch, ResponseType } = window.__TAURI__.http;
      const response = await tauriFetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          type: 'Json',
          payload: requestBody
        },
        responseType: ResponseType.Json
      });

      if (response.status !== 200) {
        throw new Error(`Ollama API request failed with status ${response.status}: ${response.data}`);
      }

      const data: OllamaResponse = response.data;
      return data.response;
    } else {
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Ollama API request failed with status ${response.status}: ${errorBody}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response;
    }
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

    console.log("🔄 Starting Ollama streaming request");
    
    const requestUrl = `${apiUrl}/api/generate`;
    const requestBody = {
        model: model,
        prompt: userPrompt,
        system: systemPrompt,
        stream: true,
    } as OllamaRequest;

    // @ts-ignore
    if (window.__TAURI__) {
        console.log("🦀 Using Tauri HTTP client for streaming");
        
        try {
            // @ts-ignore
            const { fetch: tauriFetch, ResponseType } = window.__TAURI__.http;
            
            // Make the streaming request
            const response = await tauriFetch(requestUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: {
                    type: 'Json',
                    payload: requestBody
                },
                responseType: ResponseType.Text // Get raw text to handle streaming format
            });

            if (response.status !== 200) {
                throw new Error(`Ollama API request failed with status ${response.status}: ${response.data}`);
            }

            console.log("📡 Got streaming response data:", response.data);
            
            // Parse the streaming response (multiple JSON objects separated by newlines)
            const responseText = String(response.data);
            const lines = responseText.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
                if (signal?.aborted) break;
                
                try {
                    const data: OllamaResponse = JSON.parse(line);
                    if (data.response) {
                        console.log("📝 Yielding chunk:", data.response);
                        yield data.response;
                        // Add small delay to simulate streaming
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    if (data.done) {
                        console.log("✅ Streaming completed");
                        return;
                    }
                } catch (e) {
                    console.error("Failed to parse Ollama stream chunk:", line, e);
                }
            }
        } catch (error) {
            console.error("❌ Tauri streaming failed:", error);
            throw error;
        }
    } else {
        console.log("🌐 Using standard fetch for streaming");
        const response = await fetch(requestUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
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
}


export const verifyConnection = async (apiUrl: string): Promise<{ success: boolean; message: string }> => {
  console.log("🔍 Ollama verifyConnection called with URL:", apiUrl);
  
  if (!apiUrl) {
      console.log("❌ No API URL provided");
      return { success: false, message: "Ollama API URL is missing." };
  }

  try {
      console.log("🚀 Attempting connection to:", apiUrl);
      
      // Check if we're in Tauri context and use appropriate HTTP client
      // @ts-ignore
      if (window.__TAURI__) {
          console.log("🦀 Using Tauri HTTP client");
          // @ts-ignore
          const { fetch: tauriFetch, ResponseType } = window.__TAURI__.http;
          const response = await tauriFetch(apiUrl, { 
              method: 'GET',
              responseType: ResponseType.Text
          });
          console.log("📡 Tauri fetch response:", response);
          
          if (response.status !== 200) {
              console.log("❌ Tauri response not OK. Status:", response.status);
              throw new Error(`Server responded with status ${response.status}`);
          }
          
          const text = response.data;
          console.log("📄 Tauri response data:", text);
          
          if (!text || !String(text).includes("Ollama is running")) {
              console.log("❌ Response doesn't contain 'Ollama is running'");
              throw new Error("Did not receive the expected 'Ollama is running' response.");
          }
          
          console.log("✅ Ollama connection successful via Tauri!");
          return { success: true, message: "Ollama connection successful." };
      } else {
          console.log("🌐 Using standard fetch");
          const response = await fetch(apiUrl, { method: 'GET' });
          console.log("📡 Standard fetch response received. Status:", response.status);

          if (!response.ok) {
              console.log("❌ Response not OK. Status:", response.status);
              throw new Error(`Server responded with status ${response.status}`);
          }
          
          const text = await response.text();
          console.log("📄 Response text:", text);
          
          if (!text.includes("Ollama is running")) {
              console.log("❌ Response doesn't contain 'Ollama is running'");
              throw new Error("Did not receive the expected 'Ollama is running' response.");
          }
          
          console.log("✅ Ollama connection successful!");
          return { success: true, message: "Ollama connection successful." };
      }

  } catch (error) {
      console.error("❌ Ollama connection verification failed:", error);
      console.error("Error details:", {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
          return { success: false, message: "Connection failed. Is Ollama running?" };
      }
      return { success: false, message: `Could not connect to the Ollama API URL: ${error instanceof Error ? error.message : String(error)}` };
  }
};

export const getModels = async (apiUrl: string): Promise<string[]> => {
    if (!apiUrl) {
        return Promise.reject(new Error("Ollama API URL is not configured."));
    }

    try {
        const modelsUrl = `${apiUrl}/api/tags`;
        console.log("🔍 Fetching models from:", modelsUrl);
        
        // @ts-ignore
        if (window.__TAURI__) {
            console.log("🦀 Using Tauri HTTP client for models");
            // @ts-ignore
            const { fetch: tauriFetch, ResponseType } = window.__TAURI__.http;
            const response = await tauriFetch(modelsUrl, { 
                method: 'GET',
                responseType: ResponseType.Json
            });
            console.log("📡 Tauri models response:", response);
            
            if (response.status !== 200) {
                throw new Error(`Failed to fetch models with status ${response.status}`);
            }
            
            const data: OllamaTagsResponse = response.data;
            console.log("📄 Models data:", data);
            
            if (!data.models || data.models.length === 0) {
                return [];
            }
            return data.models.map(m => m.name).sort();
        } else {
            console.log("🌐 Using standard fetch for models");
            const response = await fetch(modelsUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch models with status ${response.status}`);
            }
            const data: OllamaTagsResponse = await response.json();
            if (!data.models || data.models.length === 0) {
                return [];
            }
            return data.models.map(m => m.name).sort();
        }
    } catch (error) {
        console.error("Failed to get Ollama models:", error);
        throw new Error("Could not retrieve models from Ollama. Please ensure it's running and the API URL is correct.");
    }
};