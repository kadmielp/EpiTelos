
interface MaritacaMessage {
    role: 'system' | 'user';
    content: string;
}

interface MaritacaRequest {
    model: string;
    messages: MaritacaMessage[];
    stream?: boolean;
}

interface MaritacaResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
}

interface MaritacaModel {
    id: string;
    object: string;
    created: number;
    owned_by: string;
}

interface MaritacaModelListResponse {
    data: MaritacaModel[];
}

interface RunMaritacaOptions {
    systemPrompt: string;
    userPrompt: string;
    model: string;
    apiKey: string;
    apiUrl: string;
    signal?: AbortSignal;
}

const handleFetchError = (error: Error, apiUrl: string): string => {
    if (error.message.includes('Failed to fetch')) {
        return `Connection to Maritaca (${apiUrl}) failed. This is likely due to the provider's CORS policy, a network error, or an invalid URL. CORS is a security feature in browsers that may block this request. This connection is expected to work in a desktop app environment.`;
    }
    return `An error occurred while communicating with Maritaca: ${error.message}`;
};

export const runMaritacaFunction = async ({ systemPrompt, userPrompt, model, apiKey, apiUrl, signal }: RunMaritacaOptions): Promise<string> => {
    if (!apiKey || !apiUrl) {
        return Promise.reject(new Error("Maritaca API URL or Key is not configured."));
    }

    const fullApiUrl = `${apiUrl}/chat/completions`;
    const requestBody = {
        model: model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
    } as MaritacaRequest;

    try {
        // @ts-ignore
        if (window.__TAURI__) {
            console.log("🦀 Using Tauri HTTP client for Maritaca");
            // @ts-ignore
            const { fetch: tauriFetch, ResponseType } = window.__TAURI__.http;
            const response = await tauriFetch(fullApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: {
                    type: 'Json',
                    payload: requestBody
                },
                responseType: ResponseType.Json
            });

            if (response.status !== 200) {
                const errorMessage = response.data?.error?.message || 'An unknown error occurred';
                throw new Error(`Maritaca API request failed with status ${response.status}: ${errorMessage}`);
            }

            const data: MaritacaResponse = response.data;
            return data.choices[0]?.message?.content || 'No response content received from Maritaca.';
        } else {
            console.log("🌐 Using standard fetch for Maritaca");
            const response = await fetch(fullApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify(requestBody),
                signal,
            });

            if (!response.ok) {
                const errorBody = await response.json();
                const errorMessage = errorBody?.error?.message || 'An unknown error occurred';
                throw new Error(`Maritaca API request failed with status ${response.status}: ${errorMessage}`);
            }

            const data: MaritacaResponse = await response.json();
            return data.choices[0]?.message?.content || 'No response content received from Maritaca.';
        }
    } catch (error) {
        console.error("Error calling Maritaca API:", error);
        if (error instanceof Error) {
            return handleFetchError(error, apiUrl);
        }
        return "An unknown error occurred while communicating with Maritaca.";
    }
};

export async function* runMaritacaFunctionStream({ systemPrompt, userPrompt, model, apiKey, apiUrl, signal }: RunMaritacaOptions): AsyncGenerator<string> {
    if (!apiKey || !apiUrl) {
        throw new Error("Maritaca API URL or Key is not configured.");
    }
    const fullApiUrl = `${apiUrl}/chat/completions`;
    const requestBody = {
        model: model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        stream: true,
    };

    // @ts-ignore
    if (window.__TAURI__) {
        console.log("🦀 Using Tauri HTTP client for Maritaca streaming");

        try {
            // @ts-ignore
            const { fetch: tauriFetch, ResponseType } = window.__TAURI__.http;

            // Make the streaming request
            const response = await tauriFetch(fullApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: {
                    type: 'Json',
                    payload: requestBody
                },
                responseType: ResponseType.Text // Get raw text to handle streaming format
            });

            if (response.status !== 200) {
                const errorMessage = response.data?.error?.message || 'An unknown error occurred';
                throw new Error(`Maritaca API stream request failed with status ${response.status}: ${errorMessage}`);
            }

            console.log("📡 Got streaming response data from Maritaca");

            // Parse the streaming response (Server-Sent Events format)
            const responseText = String(response.data);
            const lines = responseText.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (signal?.aborted) break;

                if (line.startsWith('data: ')) {
                    const jsonStr = line.substring(6);
                    if (jsonStr === '[DONE]') {
                        console.log("✅ Maritaca streaming completed");
                        return;
                    }
                    try {
                        const data = JSON.parse(jsonStr);
                        const content = data.choices[0]?.delta?.content;
                        if (content) {
                            yield content;
                            // Add small delay to simulate streaming
                            await new Promise(resolve => setTimeout(resolve, 20));
                        }
                    } catch (e) {
                        console.error("Failed to parse Maritaca stream chunk:", jsonStr, e);
                    }
                }
            }
        } catch (error) {
            console.error("❌ Tauri Maritaca streaming failed:", error);
            throw error;
        }
    } else {
        console.log("🌐 Using standard fetch for Maritaca streaming");
        const response = await fetch(fullApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
            signal,
        });

        if (!response.ok || !response.body) {
            const errorBody = await response.text();
            throw new Error(`Maritaca API stream request failed with status ${response.status}: ${errorBody}`);
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
                            console.error("Error parsing Maritaca stream chunk:", e, "Chunk:", jsonStr);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
}

export const verifyConnection = async (apiUrl: string, apiKey: string): Promise<{ success: boolean; message: string }> => {
    if (!apiUrl || !apiKey) {
        return { success: false, message: "Maritaca API URL or Key is missing." };
    }

    const fullApiUrl = `${apiUrl}/models`;

    try {
        // @ts-ignore
        if (window.__TAURI__) {
            console.log("🦀 Using Tauri HTTP client for Maritaca verification");
            // @ts-ignore
            const { fetch: tauriFetch, ResponseType } = window.__TAURI__.http;
            const response = await tauriFetch(fullApiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
                responseType: ResponseType.Json
            });

            if (response.status !== 200) {
                const errorMessage = response.data?.error?.message || `API returned status ${response.status}`;
                throw new Error(errorMessage);
            }

            return { success: true, message: "Maritaca connection successful." };
        } else {
            console.log("🌐 Using standard fetch for Maritaca verification");
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

            return { success: true, message: "Maritaca connection successful." };
        }
    } catch (error) {
        console.error("Maritaca connection verification failed:", error);
        if (error instanceof Error) {
            const friendlyMessage = handleFetchError(error, apiUrl);
            return { success: false, message: friendlyMessage };
        }
        return { success: false, message: "An unknown error occurred during verification." };
    }
};


export const getModels = async (apiUrl: string, apiKey: string): Promise<string[]> => {
    if (!apiUrl || !apiKey) {
        return Promise.reject(new Error("Maritaca API URL or Key is missing."));
    }

    // Maritaca doesn't always have a standard /models endpoint that returns exactly what we expect 
    // but we can try /api/chat/models or /api/models based on docs.
    // The search said both /api/chat/models and /api/models are GET.
    // Since we use /api as base, let's try /models first.

    const fullApiUrl = `${apiUrl}/models`;

    try {
        // @ts-ignore
        if (window.__TAURI__) {
            console.log("🦀 Using Tauri HTTP client for Maritaca models");
            // @ts-ignore
            const { fetch: tauriFetch, ResponseType } = window.__TAURI__.http;
            const response = await tauriFetch(fullApiUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` },
                responseType: ResponseType.Json
            });

            if (response.status !== 200) {
                throw new Error(`API returned status ${response.status}`);
            }

            const data: MaritacaModelListResponse = response.data;
            // Handle different Maritaca formats
            if (Array.isArray(data)) {
                return data.map((m: any) => m.name || m.id).sort();
            }
            if (data.data && Array.isArray(data.data)) {
                return data.data.map(model => model.id).sort();
            }
            return ['sabia-3', 'sabia-2-medium', 'sabia-2-small']; // Fallback
        } else {
            console.log("🌐 Using standard fetch for Maritaca models");
            const response = await fetch(fullApiUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` },
            });

            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }

            const data = await response.json();
            if (Array.isArray(data)) {
                return data.map((m: any) => m.name || m.id).sort();
            }
            if (data.data && Array.isArray(data.data)) {
                return data.data.map((model: any) => model.id).sort();
            }
            return ['sabia-3', 'sabia-2-medium', 'sabia-2-small']; // Fallback
        }
    } catch (error) {
        console.error("Failed to get Maritaca models:", error);
        // If it fails, return the static list as fallback
        return ['sabia-3', 'sabia-2-medium', 'sabia-2-small'];
    }
};
