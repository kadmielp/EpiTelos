

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

interface RunCustomOptions {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  apiKey: string;
  apiUrl: string;
  signal?: AbortSignal;
}

const handleFetchError = (error: Error, apiUrl: string): string => {
    if (error.message.includes('Failed to fetch')) {
        return `Connection to ${apiUrl} failed. This is likely due to the provider's CORS policy, a network error, or an invalid URL. CORS is a security feature in browsers that may block this request. This connection is expected to work in a desktop app environment.`;
    }
    return `An error occurred while communicating with the custom provider: ${error.message}`;
};

export const runCustomProviderFunction = async ({ systemPrompt, userPrompt, model, apiKey, apiUrl, signal }: RunCustomOptions): Promise<string> => {
  if (!apiKey || !apiUrl) {
    return Promise.reject(new Error("Custom provider API URL or Key is not configured."));
  }

  const fullApiUrl = `${apiUrl}/v1/chat/completions`;

  try {
    const response = await fetch(fullApiUrl, {
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
      throw new Error(`Custom provider API request failed with status ${response.status}: ${errorMessage}`);
    }

    const data: OpenAIResponse = await response.json();
    return data.choices[0]?.message?.content || 'No response content received from the custom provider.';
  } catch (error) {
    console.error("Error calling Custom Provider API:", error);
    if (error instanceof Error) {
        return handleFetchError(error, apiUrl);
    }
    return "An unknown error occurred while communicating with the custom provider.";
  }
};

export async function* runCustomProviderFunctionStream({ systemPrompt, userPrompt, model, apiKey, apiUrl, signal }: RunCustomOptions): AsyncGenerator<string> {
    if (!apiKey || !apiUrl) {
        throw new Error("Custom provider API URL or Key is not configured.");
    }
    const fullApiUrl = `${apiUrl}/v1/chat/completions`;

    const response = await fetch(fullApiUrl, {
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
        throw new Error(`Custom provider API stream request failed with status ${response.status}: ${errorBody}`);
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
                        console.error("Error parsing custom provider stream chunk:", e, "Chunk:", jsonStr);
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}

export const verifyConnection = async (apiUrl: string, apiKey: string): Promise<{ success: boolean; message: string }> => {
  if (!apiUrl || !apiKey) {
    return { success: false, message: "Custom provider API URL or Key is missing." };
  }
  
  const fullApiUrl = `${apiUrl}/v1/models`;

  try {
    const response = await fetch(fullApiUrl, {
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
    
    return { success: true, message: "Custom provider connection successful." };

  } catch (error) {
    console.error("Custom provider connection verification failed:", error);
    if (error instanceof Error) {
        const friendlyMessage = handleFetchError(error, apiUrl);
        return { success: false, message: friendlyMessage };
    }
    return { success: false, message: "An unknown error occurred during verification." };
  }
};


export const getModels = async (apiUrl: string, apiKey: string): Promise<string[]> => {
    if (!apiUrl || !apiKey) {
        return Promise.reject(new Error("Custom provider API URL or Key is missing."));
    }
    
    const fullApiUrl = `${apiUrl}/v1/models`;
    
    try {
        const response = await fetch(fullApiUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });
    
        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }
        
        const data: OpenAIModelListResponse = await response.json();
        return data.data.map(model => model.id).sort();
    } catch (error) {
        console.error("Failed to get Custom Provider models:", error);
        if (error instanceof Error) {
             throw new Error(handleFetchError(error, apiUrl));
        }
        throw new Error("Could not retrieve models from Custom Provider. Please check your URL and API key.");
    }
};