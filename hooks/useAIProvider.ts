import { useState, useCallback, useRef, useEffect } from 'react';
import { IAIFunction, IContextSource, ISettings, VerificationStatus } from '../types';
import * as geminiService from '../services/geminiService';
import * as ollamaService from '../services/ollamaService';
import * as openaiService from '../services/openaiService';
import * as customProviderService from '../services/customProviderService';
import * as maritacaService from '../services/maritacaService';
import * as localGgufService from '../services/localGgufService';
import * as webFileService from '../services/fileService';
import * as desktopFileService from '../services/desktopFileService';
import { translate, normalizeLanguage } from '../i18n';

// @ts-ignore
const isDesktop = !!window.__TAURI__;
const fileService = isDesktop ? desktopFileService : webFileService;

const requestsOutputLanguage = (input: string): boolean =>
    /(?:answer|respond|reply|write|output|translate|response|responda|responder|escreva|escrever|traduza|traduzir|resposta|saída)[^.!?\n]{0,80}(?:in|into|to|em|para)\s+(?:brazilian\s+)?(?:portuguese|english|spanish|french|german|italian|japanese|chinese|arabic|portugu[eê]s|ingl[eê]s|espanhol|franc[eê]s|alem[aã]o|italiano|japon[eê]s|chin[eê]s|[aá]rabe)/i.test(input);

export const useAIProvider = (settings: ISettings) => {
    const t = (key: string) => translate(normalizeLanguage(settings.language), key);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [modelVerificationStatus, setModelVerificationStatus] = useState<VerificationStatus | null>(null);
    const [aiResponse, setAiResponse] = useState('');
    const [runError, setRunError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const verificationIdRef = useRef(0);

    const verifyAndLoadModels = useCallback(async (source: ISettings['modelSource'], settingsToVerify: ISettings) => {
        const verificationId = ++verificationIdRef.current;
        setModelVerificationStatus({ type: 'verifying', message: t('Verifying...') });
        setAvailableModels([]);
        let result: { success: boolean; message: string };
        let models: string[] = [];

        try {
            if (source !== 'Local GGUF' && isDesktop) await localGgufService.stopModel();
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
                case 'Local GGUF':
                    if (!isDesktop) {
                        result = { success: false, message: 'Local GGUF requires the Windows desktop app.' };
                        break;
                    }
                    models = settingsToVerify.localGgufModels || [];
                    if (settingsToVerify.preferredModel) {
                        const status = await localGgufService.startModel(settingsToVerify.preferredModel, settingsToVerify.localGgufBackend || 'auto', settingsToVerify.localGgufContextSize || 8192);
                        result = { success: true, message: `${t('Ready on ')}${status.backend.toUpperCase()}` };
                    } else {
                        result = { success: true, message: models.length ? 'Select a model to load it.' : 'Add a GGUF model file.' };
                    }
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
                    result = { success: false, message: t("Invalid model source selected.") };
            }

            if (verificationId !== verificationIdRef.current) return;
            if (result.success) {
                setModelVerificationStatus({ type: 'success', message: t(result.message) });
                setAvailableModels(models);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            if (verificationId !== verificationIdRef.current) return;
            const message = error instanceof Error ? error.message : t("An unknown error occurred.");
            setModelVerificationStatus({ type: 'error', message: t(message) });
            setAvailableModels(source === 'Local GGUF' ? (settingsToVerify.localGgufModels || []) : []);
        }
    }, [settings.language]);

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
        onSuccess?: (fullContent: string) => void;
    }) => {
        const { func, userInput, displayContexts, selectedContextIds, isStreaming, showReasoning, onSuccess } = params;

        if (!func || !settings.preferredModel) return;
        if (abortControllerRef.current) return;

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        setRunError(false);
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
        const responseLanguage = settings.language === 'pt-BR' ? 'Brazilian Portuguese (pt-BR)' : 'English';
        const userChoseLanguage = requestsOutputLanguage(userInput);
        const languageInstruction = `Write the final response in ${responseLanguage}, including headings, labels, and explanations. The language of the function instructions, examples, and source material does not set the response language. Preserve code, names, and quoted text.`;
        const requestSystemPrompt = userChoseLanguage ? func.systemPrompt : `${func.systemPrompt}\n\n--- RESPONSE LANGUAGE ---\n${languageInstruction}`;
        const fullUserPrompt = `${contextContent}\n\n--- USER INPUT ---\n${userInput}${userChoseLanguage ? '' : `\n\n--- RESPONSE LANGUAGE ---\nAnswer in ${responseLanguage}.`}`;

        try {
            if (isStreaming) {
                const streamParams = {
                    systemPrompt: requestSystemPrompt,
                    userPrompt: fullUserPrompt,
                    model: settings.preferredModel,
                    signal: controller.signal,
                };
                const getStream = () => {
                    switch (settings.modelSource) {
                        case 'Local GGUF':
                            return localGgufService.runLocalFunctionStream(streamParams);
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
                    onSuccess?.(fullResponse);
                } else {
                    for await (const chunk of stream) {
                        if (controller.signal.aborted) break;
                        fullResponse += chunk;
                        setAiResponse(fullResponse);
                    }
                    onSuccess?.(fullResponse);
                }
            } else {
                const fetchParams = {
                    systemPrompt: requestSystemPrompt,
                    userPrompt: fullUserPrompt,
                    model: settings.preferredModel,
                    signal: controller.signal,
                };
                let response = '';
                switch (settings.modelSource) {
                    case 'Local GGUF':
                        response = await localGgufService.runLocalFunction(fetchParams);
                        break;
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
                    onSuccess?.(response);
                }
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                setAiResponse(prev => prev
                    ? prev + `\n\n${t('[Generation stopped by user.]')}`
                    : t("Generation stopped.")
                );
            } else {
                setRunError(true);
                const message = error instanceof Error ? error.message : t("An unknown error occurred during AI execution.");
                const contextError = settings.modelSource === 'Local GGUF'
                    ? message.match(/request \((\d+) tokens\) exceeds the available context size \((\d+) tokens\)/i)
                    : null;
                setAiResponse(contextError
                    ? settings.language === 'pt-BR'
                        ? `O conteúdo selecionado usa ${contextError[1]} tokens, mas a janela de contexto está em ${contextError[2]}. Em Configurações > Local > GGUF, aumente a janela de contexto ou desmarque algumas fontes e tente novamente.`
                        : `The selected content uses ${contextError[1]} tokens, but the context window is ${contextError[2]}. In Settings > Local > GGUF, increase the context window or deselect some sources and try again.`
                    : t(message));
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
        runError,
        setAiResponse,
        isLoading,
        setIsLoading,
        verifyAndLoadModels,
        handleStopGeneration,
        runAIFunction
    };
};
