// src/App.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { FunctionRunner } from './components/FunctionRunner';
import { ContextManager } from './components/ContextManager';
import { FunctionManager } from './components/FunctionManager';
import { ArchiveManager } from './components/ArchiveManager';
import { Settings } from './components/Settings';
import { Modal } from './components/Modal';

// Types & Constants
import {
  View,
  IContextSource,
  ISession,
  IArchive
} from './types';
import { DEFAULT_SETTINGS } from './constants';

// Services
import * as webFileService from './services/fileService';
import * as desktopFileService from './services/desktopFileService';
import { playNotificationSound, sendSystemNotification } from './services/notificationService';
import { isDesktop } from './services/platform';

// Hooks
import { useAppProfile } from './hooks/useAppProfile';
import { useContextManager } from './hooks/useContextManager';
import { useAIProvider } from './hooks/useAIProvider';
import { useFunctions } from './hooks/useFunctions';
import { useArchives } from './hooks/useArchives';

const fileService = isDesktop ? desktopFileService : webFileService;

const App: React.FC = () => {
  // View State
  const [currentView, setCurrentView] = useState<View>(View.Runner);

  // Modular Hooks
  const profile = useAppProfile();
  const functions = useFunctions();
  const context = useContextManager(
    profile.userAddedContexts,
    profile.setUserAddedContexts,
    profile.settings,
    profile.saveProfile
  );
  const ai = useAIProvider(profile.settings);
  const history = useArchives();

  // Runner-specific state
  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null);
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  // Inspection Modal State
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [inspectModalContent, setInspectModalContent] = useState('');
  const [inspectModalTitle, setInspectModalTitle] = useState('');

  const applyDefaults = useCallback(() => {
    setSelectedFunctionId(profile.settings.defaultFunctionId);
    setSelectedContextIds(profile.settings.defaultContextIds);
    setUserInput('');
    ai.setAiResponse('');
    setIsStreaming(false);
    setShowReasoning(false);
  }, [profile.settings.defaultFunctionId, profile.settings.defaultContextIds, ai]);

  // Session management
  const resumeLastSession = async () => {
    const session: ISession | null = await fileService.loadSession();
    if (session) {
      setSelectedFunctionId(session.lastFunctionId);
      setSelectedContextIds(session.lastContextIds);
      setUserInput(session.lastUserInput);
      setIsStreaming(session.isStreaming ?? false);
      setShowReasoning(session.showReasoning ?? false);
      profile.setSettings(prev => ({ ...prev, preferredModel: session.lastModel ?? prev.preferredModel }));
    }
    profile.setShowSessionModal(false);
  };

  const startNewSession = async () => {
    await fileService.clearSession();
    applyDefaults();
    profile.setShowSessionModal(false);
  };

  const saveCurrentSession = useCallback(() => {
    profile.saveCurrentSession({
      selectedFunctionId,
      selectedContextIds,
      userInput,
      isStreaming,
      showReasoning
    });
  }, [profile, selectedFunctionId, selectedContextIds, userInput, isStreaming, showReasoning]);

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      ai.setIsLoading(true);
      const [_, loadedProfile, loadedSession] = await Promise.all([
        functions.loadFunctions(),
        fileService.loadProfile(),
        fileService.loadSession(),
      ]);

      if (loadedProfile) {
        const migratedSettings = { ...DEFAULT_SETTINGS, ...loadedProfile.settings };
        profile.setSettings(migratedSettings);
        profile.setUserAddedContexts(loadedProfile.contexts || []);
      } else {
        profile.setSettings(DEFAULT_SETTINGS);
        profile.setUserAddedContexts([]);
        await profile.saveProfile(DEFAULT_SETTINGS, []);
      }

      if (loadedSession && loadedSession.timestamp) {
        profile.setShowSessionModal(true);
      } else {
        applyDefaults();
      }
      ai.setIsLoading(false);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only once at mount

  // Provider Verification
  useEffect(() => {
    ai.verifyAndLoadModels(profile.settings.modelSource, profile.settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile.settings.modelSource,
    profile.settings.ollamaApiUrl,
    profile.settings.openaiApiKey,
    profile.settings.customApiUrl,
    profile.settings.customApiKey,
    profile.settings.maritacaApiUrl,
    profile.settings.maritacaApiKey
  ]);

  const handleRunFunction = () => {
    const func = functions.functions.find(f => f.id === selectedFunctionId);
    if (!func) return;

    ai.runAIFunction({
      func,
      userInput,
      displayContexts: context.displayContexts,
      selectedContextIds,
      isStreaming,
      showReasoning,
      onSuccess: (fullContent: string) => {
        // 1. Play notifications
        if (profile.settings.notificationEnabled) {
          playNotificationSound();
          sendSystemNotification("EpiTelos Intelligence", "AI process complete. Response is ready.");
        }

        // 2. Extract reasoning block if present
        const reasoningMatch = fullContent.match(/<think>([\s\S]*?)<\/think>/);
        const assistantResponse = fullContent.replace(/<think>[\s\S]*?<\/think>/, '').trim();

        // 3. Collect context names in the EXACT order of selectedContextIds
        const contextNames = selectedContextIds.map(id => {
          const c = context.displayContexts.find(ctx => ctx.id === id);
          return c ? c.remark : "Unknown Source";
        });

        // 4. Save to Archives
        const newArchive: IArchive = {
          id: `arch-${Date.now()}`,
          title: userInput.slice(0, 50).trim() || func.name,
          functionId: func.id,
          model: profile.settings.preferredModel,
          contextIds: [...selectedContextIds],
          contextNames,
          userInput,
          assistantResponse,
          reasoningBlock: reasoningMatch ? reasoningMatch[1].trim() : undefined,
          timestamp: Date.now(),
        };
        history.addArchive(newArchive);
      }
    });
  };

  const handleViewContext = useCallback(async (contextId: string) => {
    const source = context.displayContexts.find(c => c.id === contextId);
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
  }, [context.displayContexts]);

  // Inspect context from archive: tries current contexts first, then reads file directly by path
  const handleInspectArchivedContext = useCallback(async (contextId: string) => {
    // First try: find in currently loaded contexts
    const source = context.displayContexts.find(c => c.id === contextId);
    if (source && !source.isFolderMarker) {
      return handleViewContext(contextId);
    }

    // Fallback: reconstruct path from the encoded ID
    // ID format: ctx-<path with non-alphanumeric replaced by ->[-timestamp]
    let encoded = contextId.replace(/^ctx-/, '');
    encoded = encoded.replace(/-(\d{13})$/, ''); // remove timestamp if present

    // We can't perfectly reconstruct the path, but we can try to read it
    // The context source might still exist on disk
    const displayName = encoded.split('--').pop()?.replace(/-/g, ' ').trim() || contextId;
    setInspectModalTitle(`Inspecting: ${displayName}`);
    setInspectModalContent("Loading content...");
    setIsInspectModalOpen(true);

    try {
      // Try to find the source by matching the path in the ID
      const matchingSource = context.displayContexts.find(c => {
        const encodedPath = c.path.replace(/[^a-zA-Z0-9]/g, '-');
        return encoded === encodedPath || contextId.includes(encodedPath);
      });

      if (matchingSource) {
        const content = await fileService.getRawContextForInspection(matchingSource);
        setInspectModalContent(content);
      } else {
        setInspectModalContent("This file is no longer available in your current context sources.\n\nTo inspect it, re-add it via the Context page.");
      }
    } catch {
      setInspectModalContent("Could not load content for this source.");
    }
  }, [context.displayContexts, handleViewContext]);

  const renderView = () => {
    switch (currentView) {
      case View.Runner:
        return (
          <FunctionRunner
            functions={functions.functions}
            contexts={context.displayContexts.filter(c => !c.isHidden && !c.isFolderMarker)}
            selectedFunctionId={selectedFunctionId}
            setSelectedFunctionId={setSelectedFunctionId}
            selectedContextIds={selectedContextIds}
            setSelectedContextIds={setSelectedContextIds}
            userInput={userInput}
            setUserInput={setUserInput}
            aiResponse={ai.aiResponse}
            isLoading={ai.isLoading}
            onRun={handleRunFunction}
            onStop={ai.handleStopGeneration}
            onSaveSession={saveCurrentSession}
            handleViewContext={handleViewContext}
            isStreaming={isStreaming}
            setIsStreaming={setIsStreaming}
            showReasoning={showReasoning}
            setShowReasoning={setShowReasoning}
            selectedModel={profile.settings.preferredModel}
            onSelectModel={model => profile.updateSettings({ preferredModel: model })}
            availableModels={ai.availableModels}
            isDesktop={profile.isDesktop}
          />
        );
      case View.FunctionManager:
        return (
          <FunctionManager
            functions={functions.functions}
            onSaveFunction={functions.saveFunction}
            onDeleteFunction={functions.deleteFunction}
          />
        );
      case View.Context:
        return (
          <ContextManager
            isDesktop={profile.isDesktop}
            contexts={context.displayContexts}
            addContext={context.addContext}
            removeContexts={context.removeContexts}
            handleViewContext={handleViewContext}
            toggleContextVisibility={context.toggleContextVisibility}
            handleRefreshAllFolders={context.handleRefreshAllFolders}
          />
        );
      case View.History:
        return (
          <ArchiveManager
            archives={history.archives}
            onDelete={history.removeArchive}
            onRestore={(arch) => {
              setSelectedFunctionId(arch.functionId);
              setSelectedContextIds([...arch.contextIds]);
              setUserInput(arch.userInput);
              ai.setAiResponse(arch.assistantResponse);
              setCurrentView(View.Runner);
            }}
            onInspectContext={handleInspectArchivedContext}
            functions={functions.functions}
          />
        );
      case View.Settings:
        return (
          <Settings
            isDesktop={profile.isDesktop}
            settings={profile.settings}
            updateSettings={profile.updateSettings}
            contexts={profile.userAddedContexts}
            functions={functions.functions}
            onExport={profile.exportProfile}
            onImport={profile.importProfile}
            availableModels={ai.availableModels}
            verificationStatus={ai.modelVerificationStatus}
            verifyAndLoadModels={ai.verifyAndLoadModels}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-900 via-slate-900 to-slate-950 text-slate-200 selection:bg-blue-500/20 overflow-hidden">
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        isCollapsed={profile.settings.sidebarCollapsed || false}
        onToggle={() => profile.updateSettings({ sidebarCollapsed: !profile.settings.sidebarCollapsed })}
      />

      <main className="flex-1 overflow-hidden relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
        {/* Global Background Overlays */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        </div>

        <div
          key={currentView}
          className="h-full w-full animate-slide-up relative z-10"
        >
          {renderView()}
        </div>
      </main>

      <Modal
        isOpen={isInspectModalOpen}
        onClose={() => setIsInspectModalOpen(false)}
        title={inspectModalTitle}
      >
        <pre className="whitespace-pre-wrap bg-slate-900 p-4 rounded text-slate-300 text-sm max-h-[60vh] overflow-y-auto custom-scrollbar">
          {inspectModalContent}
        </pre>
      </Modal>

      <Modal isOpen={profile.showSessionModal} title="Welcome Back">
        <p className="text-slate-300 mb-6">
          You have a saved session. Would you like to resume where you left off?
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={startNewSession}
            className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Start New Session
          </button>
          <button
            onClick={resumeLastSession}
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