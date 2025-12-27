// src/App.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { FunctionRunner } from './components/FunctionRunner';
import { ContextManager } from './components/ContextManager';
import { FunctionManager } from './components/FunctionManager';
import { Settings } from './components/Settings';
import { Modal } from './components/Modal';
import {
  View,
  IAIFunction,
  IContextSource,
  ISettings,
  ISession,
  VerificationStatus
} from './types';
import { DEFAULT_SETTINGS, EMPTY_SESSION } from './constants';
import * as webFileService from './services/fileService';
import * as desktopFileService from './services/desktopFileService';
import * as geminiService from './services/geminiService';
import * as ollamaService from './services/ollamaService';
import * as openaiService from './services/openaiService';
import * as customProviderService from './services/customProviderService';
import * as maritacaService from './services/maritacaService';

// @ts-ignore
const isDesktop = !!window.__TAURI__;
const fileService = isDesktop ? desktopFileService : webFileService;

const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();

    const playTone = (freq: number, startTime: number, duration: number, volume: number) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = audioContext.currentTime;
    // A soft, premium double-chime
    playTone(659.25, now, 0.4, 0.05); // E5
    playTone(880.00, now + 0.12, 0.5, 0.04); // A5
  } catch (e) {
    console.error("Failed to play notification sound", e);
  }
};

const sendSystemNotification = async (title: string, body: string) => {
  // @ts-ignore
  if (isDesktop && window.__TAURI__) {
    try {
      // @ts-ignore
      const permissionGranted = await window.__TAURI__.notification.isPermissionGranted();
      if (!permissionGranted) {
        // @ts-ignore
        const permission = await window.__TAURI__.notification.requestPermission();
        if (permission !== 'granted') return;
      }
      // @ts-ignore
      window.__TAURI__.notification.sendNotification({ title, body });
    } catch (e) {
      console.error("Failed to send notification", e);
    }
  }
};

const useAppLogic = () => {
  const [currentView, setCurrentView] = useState<View>(View.Runner);
  const [functions, setFunctions] = useState<IAIFunction[]>([]);
  const [userAddedContexts, setUserAddedContexts] = useState<IContextSource[]>([]);
  const [displayContexts, setDisplayContexts] = useState<IContextSource[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const [settings, setSettings] = useState<ISettings>(DEFAULT_SETTINGS);

  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null);
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [userInput, setUserInput] = useState('');

  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);

  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [inspectModalContent, setInspectModalContent] = useState('');
  const [inspectModalTitle, setInspectModalTitle] = useState('');

  const [isStreaming, setIsStreaming] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelVerificationStatus, setModelVerificationStatus] = useState<VerificationStatus | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const userAddedContextsRef = useRef(userAddedContexts);
  userAddedContextsRef.current = userAddedContexts;

  // Save profile
  const saveProfile = useCallback(async (currentSettings: ISettings, currentContexts: IContextSource[]) => {
    await fileService.saveProfile({ settings: currentSettings, contexts: currentContexts });
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<ISettings>) => {
    setSettings(prevSettings => {
      let updated = { ...prevSettings, ...newSettings };

      // Sync provider-specific model fields if preferredModel is updated
      if (newSettings.preferredModel !== undefined) {
        const sourceField = `${updated.modelSource.toLowerCase()}Model` as keyof ISettings;
        updated = {
          ...updated,
          [sourceField]: newSettings.preferredModel
        };
      }

      saveProfile(updated, userAddedContextsRef.current);
      return updated;
    });
  }, [saveProfile]);

  // Verify & load models
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

  // Load initial data
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);

    const [loadedFuncs, loadedProfile, loadedSession] = await Promise.all([
      fileService.getFunctions(),
      fileService.loadProfile(),
      fileService.loadSession(),
    ]);

    setFunctions(loadedFuncs);

    if (loadedProfile) {
      const migratedSettings = { ...DEFAULT_SETTINGS, ...loadedProfile.settings };
      setSettings(migratedSettings);
      setUserAddedContexts(loadedProfile.contexts || []);
    } else {
      setSettings(DEFAULT_SETTINGS);
      setUserAddedContexts([]);
      await saveProfile(DEFAULT_SETTINGS, []);
    }


    if (loadedSession && loadedSession.timestamp) {
      setShowSessionModal(true);
    } else {
      applyDefaults();
    }

    setIsLoading(false);
  }, [saveProfile]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    verifyAndLoadModels(
      settings.modelSource,
      settings
    );
    // Only re-run when relevant keys change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.modelSource,
    settings.ollamaApiUrl,
    settings.openaiApiKey,
    settings.customApiUrl,
    settings.customApiKey,
    settings.maritacaApiUrl,
    settings.maritacaApiKey
  ]);

  useEffect(() => {
    const expandContextsForDisplay = async () => {
      const allDisplayContexts: IContextSource[] = [];
      for (const source of userAddedContexts) {
        if (source.type === 'file') {
          allDisplayContexts.push({ ...source, isUserAdded: true });
        } else {
          allDisplayContexts.push({ ...source, isFolderMarker: true, isUserAdded: true });
          const files = await fileService.expandFolderSource(source);
          allDisplayContexts.push(...files);
        }
      }
      setDisplayContexts(allDisplayContexts);
    };
    expandContextsForDisplay();
  }, [userAddedContexts, refreshKey]);

  const applyDefaults = () => {
    setSelectedFunctionId(settings.defaultFunctionId);
    setSelectedContextIds(settings.defaultContextIds);
    setUserInput('');
    setAiResponse('');
    setIsStreaming(false);
    setShowReasoning(false);
  };

  // Session management
  const resumeLastSession = async () => {
    const session: ISession | null = await fileService.loadSession();
    if (session) {
      setSelectedFunctionId(session.lastFunctionId);
      setSelectedContextIds(session.lastContextIds);
      setUserInput(session.lastUserInput);
      setIsStreaming(session.isStreaming ?? false);
      setShowReasoning(session.showReasoning ?? false);
      setSettings(prev => ({ ...prev, preferredModel: session.lastModel ?? prev.preferredModel }));
    }
    setShowSessionModal(false);
  };

  const startNewSession = async () => {
    await fileService.clearSession();
    applyDefaults();
    setShowSessionModal(false);
  };

  const saveCurrentSession = useCallback(async () => {
    const session: ISession = {
      lastFunctionId: selectedFunctionId,
      lastModel: settings.preferredModel,
      lastContextIds: selectedContextIds,
      lastUserInput: userInput,
      isStreaming: isStreaming,
      showReasoning: showReasoning,
      timestamp: Date.now(),
    };
    await fileService.saveSession(session);
  }, [
    selectedFunctionId,
    settings.preferredModel,
    selectedContextIds,
    userInput,
    isStreaming,
    showReasoning
  ]);

  // Stop generation
  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Core run logic (with first‐chunk think‐tag detection)
  const handleRunFunction = async () => {
    const func = functions.find(f => f.id === selectedFunctionId);
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
          // No tag stripping - showReasoning is ON
          for await (const chunk of stream) {
            if (controller.signal.aborted) break;
            fullResponse += chunk;
            setAiResponse(fullResponse);
          }
        }
      } else {
        // Non-streaming branch unchanged
        const params = {
          systemPrompt: func.systemPrompt,
          userPrompt: fullUserPrompt,
          model: settings.preferredModel,
          signal: controller.signal,
        };
        let response = '';
        switch (settings.modelSource) {
          case 'Ollama':
            response = await ollamaService.runOllamaFunction({
              ...params,
              apiUrl: settings.ollamaApiUrl || ''
            });
            break;
          case 'OpenAI':
            response = await openaiService.runOpenAIFunction({
              ...params,
              apiKey: settings.openaiApiKey || ''
            });
            break;
          case 'Custom':
            response = await customProviderService.runCustomProviderFunction({
              ...params,
              apiKey: settings.customApiKey || '',
              apiUrl: settings.customApiUrl || ''
            });
            break;
          case 'Maritaca':
            response = await maritacaService.runMaritacaFunction({
              ...params,
              apiKey: settings.maritacaApiKey || '',
              apiUrl: settings.maritacaApiUrl || ''
            });
            break;
          case 'Gemini':
          default:
            response = await geminiService.runAIFunction({
              ...params,
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
      // Play notification sound when finished (and not aborted)
      if (!controller.signal.aborted && settings.notificationEnabled) {
        playNotificationSound();
        sendSystemNotification("EpiTelos Intelligence", "AI process complete. Response is ready.");
      }
    }
  };

  // Function management
  const saveFunction = async (func: Partial<IAIFunction>) => {
    await fileService.saveFunction(func);
    const updatedFunctions = await fileService.getFunctions();
    setFunctions(updatedFunctions);
  };
  const deleteFunction = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this custom function?")) {
      await fileService.deleteFunction(id);
      const updatedFunctions = await fileService.getFunctions();
      setFunctions(updatedFunctions);
    }
  };

  // Context management
  const addContext = async (
    path: string,
    remark: string,
    type: 'folder' | 'file',
    includeSubfolders: boolean
  ) => {
    if (userAddedContexts.some(c => c.path === path)) {
      alert("This context source has already been added.");
      return;
    }
    const newSource: IContextSource = {
      id: `ctx-${path.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
      path,
      remark,
      type,
      includeSubfolders: type === 'folder' ? includeSubfolders : false,
      isHidden: false
    };
    const newContexts = [...userAddedContexts, newSource];
    setUserAddedContexts(newContexts);
    saveProfile(settings, newContexts);
  };

  const removeContexts = (idsToRemove: string[]) => {
    if (!idsToRemove.length) return;
    const newContexts = [...userAddedContexts];
    const contextsToReallyRemove: string[] = [];
    let modified = false;

    for (const id of idsToRemove) {
      const sourceToRemove = displayContexts.find(c => c.id === id);
      if (!sourceToRemove) continue;

      if (sourceToRemove.isUserAdded) {
        contextsToReallyRemove.push(id);
        modified = true;
      } else {
        const parentFolderIndex = newContexts.findIndex(c =>
          c.type === 'folder' &&
          sourceToRemove.path.startsWith(c.path)
        );
        if (parentFolderIndex !== -1) {
          const parentFolder = { ...newContexts[parentFolderIndex] };
          parentFolder.excludedPaths = [
            ...(parentFolder.excludedPaths || []),
            sourceToRemove.path
          ];
          newContexts[parentFolderIndex] = parentFolder;
          modified = true;
        }
      }
    }

    const finalContexts = newContexts.filter(c => !contextsToReallyRemove.includes(c.id));
    if (modified) {
      setUserAddedContexts(finalContexts);
      saveProfile(settings, finalContexts);
    }
  };

  const toggleContextVisibility = (contextId: string) => {
    const sourceToToggle = displayContexts.find(c => c.id === contextId);
    if (!sourceToToggle) return;

    const newContexts = userAddedContexts.map(c => ({ ...c }));
    let modified = false;

    if (sourceToToggle.isUserAdded) {
      const index = newContexts.findIndex(c => c.id === contextId);
      if (index > -1) {
        newContexts[index].isHidden = !newContexts[index].isHidden;
        if (newContexts[index].type === 'folder') {
          delete newContexts[index].overrideHidden;
        }
        modified = true;
      }
    } else {
      const parentFolderIndex = newContexts.findIndex(c =>
        c.type === 'folder' && sourceToToggle.path.startsWith(c.path)
      );
      if (parentFolderIndex > -1) {
        const parentFolder = newContexts[parentFolderIndex];
        parentFolder.overrideHidden = {
          ...(parentFolder.overrideHidden || {}),
          [sourceToToggle.path]: !sourceToToggle.isHidden
        };
        modified = true;
      }
    }

    if (modified) {
      setUserAddedContexts(newContexts);
      saveProfile(settings, newContexts);
    }
  };

  const handleRefreshAllFolders = () => {
    if (userAddedContexts.some(c => c.type === 'folder' && c.includeSubfolders)) {
      setRefreshKey(prev => prev + 1);
    }
  };

  const handleViewContext = useCallback(async (contextId: string) => {
    const source = displayContexts.find(c => c.id === contextId);
    if (!source || source.isFolderMarker) return;

    setInspectModalTitle(`Inspecting: ${source.remark}`);
    setInspectModalContent("Loading content...");
    setIsInspectModalOpen(true);

    try {
      const content = await fileService.getRawContextForInspection(source);
      setInspectModalContent(content);
    } catch {
      setInspectModalContent("Could not load content for this source.");
    }
  }, [displayContexts]);

  const exportProfile = async () => {
    const profileData = { settings, contexts: userAddedContexts };
    const profileJson = JSON.stringify(profileData, null, 2);
    if (isDesktop && window.__TAURI__) {
      // @ts-ignore
      const path = await window.__TAURI__.dialog.save({
        defaultPath: 'epitelos_profile.json',
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });
      if (path) {
        // @ts-ignore
        await window.__TAURI__.fs.writeTextFile(path, profileJson);
      }
    } else {
      const blob = new Blob([profileJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'epitelos_profile.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const importProfile = async (
    eventOrPath: React.ChangeEvent<HTMLInputElement> | string
  ) => {
    let profileJson: string | null = null;
    if (typeof eventOrPath === 'string' && isDesktop && window.__TAURI__) {
      // @ts-ignore
      profileJson = await window.__TAURI__.fs.readTextFile(eventOrPath);
    } else if (typeof eventOrPath !== 'string') {
      const file = eventOrPath.target.files?.[0];
      if (!file) return;
      profileJson = await file.text();
    }

    if (profileJson) {
      try {
        const importedProfile = JSON.parse(profileJson);
        const migratedSettings = { ...DEFAULT_SETTINGS, ...importedProfile.settings };
        const migratedContexts = (importedProfile.contexts || []).map((c: any) => ({
          ...c,
          type: c.type || 'folder',
          isHidden: c.isHidden || false,
          includeSubfolders: c.includeSubfolders || false
        }));
        setSettings(migratedSettings);
        setUserAddedContexts(migratedContexts);
        await saveProfile(migratedSettings, migratedContexts);
        alert('Profile imported successfully!');
      } catch {
        alert('Failed to import profile. The file might be corrupted.');
      }
    }
  };

  return {
    currentView,
    setCurrentView,
    functions,
    userAddedContexts,
    displayContexts,
    settings,
    updateSettings,
    selectedFunctionId,
    setSelectedFunctionId,
    selectedContextIds,
    setSelectedContextIds,
    userInput,
    setUserInput,
    aiResponse,
    isLoading,
    isDesktop,
    handleRunFunction,
    handleStopGeneration,
    saveFunction,
    deleteFunction,
    addContext,
    removeContexts,
    handleViewContext,
    toggleContextVisibility,
    handleRefreshAllFolders,
    exportProfile,
    importProfile,
    showSessionModal,
    resumeLastSession,
    startNewSession,
    saveCurrentSession,
    isInspectModalOpen,
    setIsInspectModalOpen,
    inspectModalContent,
    inspectModalTitle,
    isStreaming,
    setIsStreaming,
    showReasoning,
    setShowReasoning,
    availableModels,
    modelVerificationStatus,
    verifyAndLoadModels,
  };
};

const App: React.FC = () => {
  const logic = useAppLogic();

  const renderView = () => {
    switch (logic.currentView) {
      case View.Runner:
        return (
          <FunctionRunner
            functions={logic.functions}
            contexts={logic.displayContexts.filter(c => !c.isHidden && !c.isFolderMarker)}
            selectedFunctionId={logic.selectedFunctionId}
            setSelectedFunctionId={logic.setSelectedFunctionId}
            selectedContextIds={logic.selectedContextIds}
            setSelectedContextIds={logic.setSelectedContextIds}
            userInput={logic.userInput}
            setUserInput={logic.setUserInput}
            aiResponse={logic.aiResponse}
            isLoading={logic.isLoading}
            onRun={logic.handleRunFunction}
            onStop={logic.handleStopGeneration}
            onSaveSession={logic.saveCurrentSession}
            handleViewContext={logic.handleViewContext}
            isStreaming={logic.isStreaming}
            setIsStreaming={logic.setIsStreaming}
            showReasoning={logic.showReasoning}
            setShowReasoning={logic.setShowReasoning}
            selectedModel={logic.settings.preferredModel}
            onSelectModel={model => logic.updateSettings({ preferredModel: model })}
            availableModels={logic.availableModels}
            isDesktop={logic.isDesktop}
          />
        );
      case View.FunctionManager:
        return (
          <FunctionManager
            functions={logic.functions}
            onSaveFunction={logic.saveFunction}
            onDeleteFunction={logic.deleteFunction}
          />
        );
      case View.Context:
        return (
          <ContextManager
            isDesktop={logic.isDesktop}
            contexts={logic.displayContexts}
            addContext={logic.addContext}
            removeContexts={logic.removeContexts}
            handleViewContext={logic.handleViewContext}
            toggleContextVisibility={logic.toggleContextVisibility}
            handleRefreshAllFolders={logic.handleRefreshAllFolders}
          />
        );
      case View.Settings:
        return (
          <Settings
            isDesktop={logic.isDesktop}
            settings={logic.settings}
            updateSettings={logic.updateSettings}
            contexts={logic.userAddedContexts}
            functions={logic.functions}
            onExport={logic.exportProfile}
            onImport={logic.importProfile}
            availableModels={logic.availableModels}
            verificationStatus={logic.modelVerificationStatus}
            verifyAndLoadModels={logic.verifyAndLoadModels}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-200">
      <Sidebar currentView={logic.currentView} setCurrentView={logic.setCurrentView} />
      <main className="flex-1 overflow-hidden">{renderView()}</main>

      <Modal
        isOpen={logic.isInspectModalOpen}
        onClose={() => logic.setIsInspectModalOpen(false)}
        title={logic.inspectModalTitle}
      >
        <pre className="whitespace-pre-wrap bg-slate-900 p-4 rounded text-slate-300 text-sm max-h-[60vh] overflow-y-auto">
          {logic.inspectModalContent}
        </pre>
      </Modal>

      <Modal isOpen={logic.showSessionModal} title="Welcome Back">
        <p className="text-slate-300 mb-6">
          You have a saved session. Would you like to resume where you left off?
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={logic.startNewSession}
            className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Start New Session
          </button>
          <button
            onClick={logic.resumeLastSession}
            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          >
            Resume Last Session
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default App;