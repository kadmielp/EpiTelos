// src/App.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { FunctionRunner } from './components/FunctionRunner';
import { ContextManager } from './components/ContextManager';
import { FunctionManager } from './components/FunctionManager';
import { Settings } from './components/Settings';
import { Modal } from './components/Modal';
import {
  View,
  IContextSource,
  ISession
} from './types';
import { DEFAULT_SETTINGS } from './constants';
import * as webFileService from './services/fileService';
import * as desktopFileService from './services/desktopFileService';

// Hooks
import { useAppProfile } from './hooks/useAppProfile';
import { useContextManager } from './hooks/useContextManager';
import { useAIProvider } from './hooks/useAIProvider';
import { useFunctions } from './hooks/useFunctions';

// @ts-ignore
const isDesktop = !!window.__TAURI__;
const fileService = isDesktop ? desktopFileService : webFileService;

import { playNotificationSound, sendSystemNotification } from './services/notificationService';

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
      const [loadedFuncs, loadedProfile, loadedSession] = await Promise.all([
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
      onSuccess: () => {
        if (profile.settings.notificationEnabled) {
          playNotificationSound();
          sendSystemNotification("EpiTelos Intelligence", "AI process complete. Response is ready.");
        }
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
    <div className="flex h-screen w-screen bg-slate-900 text-slate-200 selection:bg-blue-500/20">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

      <main className="flex-1 overflow-hidden relative">
        <div
          key={currentView}
          className="h-full w-full animate-slide-up"
        >
          {renderView()}
        </div>
      </main>

      <Modal
        isOpen={isInspectModalOpen}
        onClose={() => setIsInspectModalOpen(false)}
        title={inspectModalTitle}
      >
        <pre className="whitespace-pre-wrap bg-slate-900 p-4 rounded text-slate-300 text-sm max-h-[60vh] overflow-y-auto">
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