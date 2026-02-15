import { useState, useCallback, useRef, useEffect } from 'react';
import { IAIFunction, IContextSource, ISettings, VerificationStatus } from '../types';
import * as geminiService from '../services/geminiService';
import * as ollamaService from '../services/ollamaService';
import * as openaiService from '../services/openaiService';
import * as customProviderService from '../services/customProviderService';
import * as maritacaService from '../services/maritacaService';
import * as webFileService from '../services/fileService';
import * as desktopFileService from '../services/desktopFileService';

// @ts-ignore
const isDesktop = !!window.__TAURI__;
const fileService = isDesktop ? desktopFileService : webFileService;

export const useAIProvider = (settings: ISettings) => {
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [modelVerificationStatus, setModelVerificationStatus] = useState<VerificationStatus | null>(null);
    const [aiResponse, setAiResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const verifyAndLoadModels = useCallback(async (source: ISettings['modelSource'], settingsToVerify: ISettings) => {
        setModelVerificationStatus({ type: 'verifying', message: 'Verifying...' });
        setAvailableModels([]);
        let result: { success: boolean; message: string };
        let models: string[] = [];

        try {
            switch (source) {
                case 'Gemini':
                    result = await geminiService.verifyConnection(settingsToVerify.geminiApiKey || '');
                    if (result.success) models = await geminiService.getModels(settingsToVerify.geminiApiKey || '');
                    break;
                case 'OpenAI':
                    result = await openaiService.verifyConnection(settingsToVerify.openaiApiKey || '');
                    if (result.success) models = await openaiService.getModels(settingsToVerify.openaiApiKey || '');
                    break;
                case 'Ollama':
                    result = await ollamaService.verifyConnection(settingsToVerify.ollamaApiUrl || '');
                    if (result.success) models = await ollamaService.getModels(settingsToVerify.ollamaApiUrl || '');
                    break;
                case 'Custom':
                    result = await customProviderService.verifyConnection(
                        settingsToVerify.customApiUrl || '',
                        settingsToVerify.customApiKey || ''
                    );
                    if (result.success) models = await customProviderService.getModels(
                        settingsToVerify.customApiUrl || '',
                        settingsToVerify.customApiKey || ''
                    );
                    break;
                case 'Maritaca':
                    result = await maritacaService.verifyConnection(
                        settingsToVerify.maritacaApiUrl || '',
                        settingsToVerify.maritacaApiKey || ''
                    );
                    if (result.success) models = await maritacaService.getModels(
                        settingsToVerify.maritacaApiUrl || '',
                        settingsToVerify.maritacaApiKey || ''
                    );
                    break;
                default:
                    result = { success: false, message: "Invalid model source selected." };
            }

            if (result.success) {
                setModelVerificationStatus({ type: 'success', message: result.message });
                setAvailableModels(models);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "An unknown error occurred.";
            setModelVerificationStatus({ type: 'error', message });
            setAvailableModels([]);
        }
    }, []);

    const handleStopGeneration = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    const runAIFunction = async (params: {
        func: IAIFunction;
        userInput: string;
        displayContexts: IContextSource[];
        selectedContextIds: string[];
        isStreaming: boolean;
        showReasoning: boolean;
        onSuccess?: () => void;
    }) => {
        const { func, userInput, displayContexts, selectedContextIds, isStreaming, showReasoning, onSuccess } = params;

        if (!func || !settings.preferredModel) return;
        if (abortControllerRef.current) return;

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        setAiResponse('');

        // Build context + prompt
        const potentialSources = displayContexts.filter(c => selectedContextIds.includes(c.id) && !c.isHidden);
        const selectedFolders = potentialSources.filter(c => c.type === 'folder');
        const sourcesToRead = potentialSources.filter(source => {
            if (source.type === 'folder') return true;
            const isContained = selectedFolders.some(folder => {
                const folderPath = folder.path.endsWith('/') ? folder.path : `${folder.path}/`;
                return source.path.startsWith(folderPath);
            });
            return !isContained;
        });
        const contextContent = await fileService.readContextSources(sourcesToRead);
        const fullUserPrompt = `${contextContent}\n\n--- USER INPUT ---\n${userInput}`;

        try {
            if (isStreaming) {
                const streamParams = {
                    systemPrompt: func.systemPrompt,
                    userPrompt: fullUserPrompt,
                    model: settings.preferredModel,
                    signal: controller.signal,
                };
                const getStream = () => {
                    switch (settings.modelSource) {
                        case 'Ollama':
                            return ollamaService.runOllamaFunctionStream({
                                ...streamParams,
                                apiUrl: settings.ollamaApiUrl || ''
                            });
                        case 'OpenAI':
                            return openaiService.runOpenAIFunctionStream({
                                ...streamParams,
                                apiKey: settings.openaiApiKey || ''
                            });
                        case 'Custom':
                            return customProviderService.runCustomProviderFunctionStream({
                                ...streamParams,
                                apiKey: settings.customApiKey || '',
                                apiUrl: settings.customApiUrl || ''
                            });
                        case 'Maritaca':
                            return maritacaService.runMaritacaFunctionStream({
                                ...streamParams,
                                apiKey: settings.maritacaApiKey || '',
                                apiUrl: settings.maritacaApiUrl || ''
                            });
                        case 'Gemini':
                        default:
                            return geminiService.runAIFunctionStream({
                                ...streamParams,
                                apiKey: settings.geminiApiKey || ''
                            });
                    }
                };

                const stream = getStream();
                let fullResponse = '';

                if (!showReasoning) {
                    let displayResponse = '';
                    let hasExitedThinking = false;
                    let streamHadContent = false;
                    let initialChunk = true;

                    for await (const chunk of stream) {
                        if (controller.signal.aborted) break;
                        streamHadContent = true;
                        fullResponse += chunk;

                        if (initialChunk) {
                            initialChunk = false;
                            if (!fullResponse.startsWith('<think>')) {
                                hasExitedThinking = true;
                                displayResponse += chunk;
                                setAiResponse(displayResponse);
                            }
                            continue;
                        }

                        if (!hasExitedThinking) {
                            if (fullResponse.includes('</think>')) {
                                hasExitedThinking = true;
                                displayResponse = fullResponse
                                    .replace(/<think>[\s\S]*?<\/think>/, '')
                                    .trimStart();
                                setAiResponse(displayResponse);
                            }
                        } else {
                            displayResponse += chunk;
                            setAiResponse(displayResponse);
                        }
                    }

                    if (streamHadContent && !hasExitedThinking) {
                        setAiResponse(fullResponse);
                    }
                } else {
                    for await (const chunk of stream) {
                        if (controller.signal.aborted) break;
                        fullResponse += chunk;
                        setAiResponse(fullResponse);
                    }
                }
            } else {
                const fetchParams = {
                    systemPrompt: func.systemPrompt,
                    userPrompt: fullUserPrompt,
                    model: settings.preferredModel,
                    signal: controller.signal,
                };
                let response = '';
                switch (settings.modelSource) {
                    case 'Ollama':
                        response = await ollamaService.runOllamaFunction({
                            ...fetchParams,
                            apiUrl: settings.ollamaApiUrl || ''
                        });
                        break;
                    case 'OpenAI':
                        response = await openaiService.runOpenAIFunction({
                            ...fetchParams,
                            apiKey: settings.openaiApiKey || ''
                        });
                        break;
                    case 'Custom':
                        response = await customProviderService.runCustomProviderFunction({
                            ...fetchParams,
                            apiKey: settings.customApiKey || '',
                            apiUrl: settings.customApiUrl || ''
                        });
                        break;
                    case 'Maritaca':
                        response = await maritacaService.runMaritacaFunction({
                            ...fetchParams,
                            apiKey: settings.maritacaApiKey || '',
                            apiUrl: settings.maritacaApiUrl || ''
                        });
                        break;
                    case 'Gemini':
                    default:
                        response = await geminiService.runAIFunction({
                            ...fetchParams,
                            apiKey: settings.geminiApiKey || ''
                        });
                        break;
                }
                if (!controller.signal.aborted) {
                    if (!showReasoning) {
                        response = response.replace(/<think>[\s\S]*?<\/think>/, '').trim();
                    }
                    setAiResponse(response);
                }
            }
            onSuccess?.();
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                setAiResponse(prev => prev
                    ? prev + "\n\n[Generation stopped by user.]"
                    : "Generation stopped."
                );
            } else {
                setAiResponse(
                    error instanceof Error
                        ? error.message
                        : "An unknown error occurred during AI execution."
                );
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    return {
        availableModels,
        modelVerificationStatus,
        aiResponse,
        setAiResponse,
        isLoading,
        setIsLoading,
        verifyAndLoadModels,
        handleStopGeneration,
        runAIFunction
    };
};
