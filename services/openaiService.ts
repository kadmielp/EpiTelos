

interface OpenAIMessage {
  role: 'system' | 'user';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  stream?: boolean;
}

interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

interface OpenAIModel {
    id: string;
    object: string;
    created: number;
    owned_by: string;
}

interface OpenAIModelListResponse {
    data: OpenAIModel[];
}

interface RunOpenAIOptions {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  apiKey: string;
  signal?: AbortSignal;
}

const API_URL = 'https://api.openai.com/v1/chat/completions';

export const runOpenAIFunction = async ({ systemPrompt, userPrompt, model, apiKey, signal }: RunOpenAIOptions): Promise<string> => {
  if (!apiKey) {
    return Promise.reject(new Error("OpenAI API key is not configured. Please add it in Settings."));
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      } as OpenAIRequest),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.json();
      const errorMessage = errorBody?.error?.message || 'An unknown error occurred';
      throw new Error(`OpenAI API request failed with status ${response.status}: ${errorMessage}`);
    }

    const data: OpenAIResponse = await response.json();
    return data.choices[0]?.message?.content || 'No response content received from OpenAI.';
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    if (error instanceof Error) {
        return `An error occurred while communicating with the OpenAI API: ${error.message}`;
    }
    return "An unknown error occurred while communicating with the OpenAI API.";
  }
};

export async function* runOpenAIFunctionStream({ systemPrompt, userPrompt, model, apiKey, signal }: RunOpenAIOptions): AsyncGenerator<string> {
    if (!apiKey) {
        throw new Error("OpenAI API key is not configured.");
    }

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            stream: true,
        }),
        signal,
    });

    if (!response.ok || !response.body) {
        const errorBody = await response.text();
        throw new Error(`OpenAI API stream request failed with status ${response.status}: ${errorBody}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.substring(6);
                    if (jsonStr === '[DONE]') {
                        return; // Stream finished
                    }
                    try {
                        const data = JSON.parse(jsonStr);
                        const content = data.choices[0]?.delta?.content;
                        if (content) {
                            yield content;
                        }
                    } catch (e) {
                        console.error("Error parsing OpenAI stream chunk:", e, "Chunk:", jsonStr);
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}

export const verifyConnection = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
  if (!apiKey) {
    return { success: false, message: "OpenAI API key is missing." };
  }

  const MODELS_API_URL = 'https://api.openai.com/v1/models';

  try {
    const response = await fetch(MODELS_API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
        const errorBody = await response.json();
        const errorMessage = errorBody?.error?.message || `API returned status ${response.status}`;
        throw new Error(errorMessage);
    }
    
    return { success: true, message: "OpenAI connection successful." };

  } catch (error) {
    console.error("OpenAI connection verification failed:", error);
    if (error instanceof Error) {
        return { success: false, message: `Connection failed: ${error.message}` };
    }
    return { success: false, message: "An unknown error occurred during verification." };
  }
};


export const getModels = async (apiKey: string): Promise<string[]> => {
    if (!apiKey) {
        return Promise.reject(new Error("OpenAI API key is missing."));
    }
    
    const MODELS_API_URL = 'https://api.openai.com/v1/models';
    
    try {
        const response = await fetch(MODELS_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });
    
        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }
        
        const data: OpenAIModelListResponse = await response.json();
        
        // Filter for relevant chat models and sort them
        const chatModels = data.data
            .filter(model => model.id.startsWith('gpt-'))
            .map(model => model.id)
            .sort((a, b) => {
                // Prioritize gpt-4 models
                if (a.startsWith('gpt-4') && !b.startsWith('gpt-4')) return -1;
                if (!a.startsWith('gpt-4') && b.startsWith('gpt-4')) return 1;
                // Simple string sort as fallback
                return b.localeCompare(a);
            });
            
        return chatModels;
    } catch (error) {
        console.error("Failed to get OpenAI models:", error);
        throw new Error("Could not retrieve models from OpenAI. Please check your API key.");
    }
};