import { useLanguage } from '../i18n';
import React, { useState, useCallback } from 'react';
import { IAIFunction, IContextSource } from '../types';
import { Modal } from './Modal';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { ControlHub } from './runner/ControlHub';
import { ResponseTerminal } from './runner/ResponseTerminal';
import { MLIcon } from './icons/MLIcon';

interface FunctionRunnerProps {
  functions: IAIFunction[];
  contexts: IContextSource[];
  selectedFunctionId: string | null;
  setSelectedFunctionId: (id: string | null) => void;
  selectedContextIds: string[];
  setSelectedContextIds: (ids: string[]) => void;
  userInput: string;
  setUserInput: (input: string) => void;
  aiResponse: string;
  runError: boolean;
  isLoading: boolean;
  onRun: () => void;
  onStop: () => void;
  onSaveSession: () => void;
  handleViewContext: (id: string) => void;
  isStreaming: boolean;
  setIsStreaming: (isStreaming: boolean) => void;
  showReasoning: boolean;
  setShowReasoning: (show: boolean) => void;
  selectedModel: string | null;
  onSelectModel: (model: string) => void;
  availableModels: string[];
  isDesktop: boolean;
}

export const FunctionRunner: React.FC<FunctionRunnerProps> = ({
  functions,
  contexts,
  selectedFunctionId,
  setSelectedFunctionId,
  selectedContextIds,
  setSelectedContextIds,
  userInput,
  setUserInput,
  aiResponse,
  runError,
  isLoading,
  onRun,
  onStop,
  onSaveSession,
  handleViewContext,
  isStreaming,
  setIsStreaming,
  showReasoning,
  setShowReasoning,
  selectedModel,
  onSelectModel,
  availableModels,
  isDesktop
}) => {
    const { t } = useLanguage();
  const [collapsedLeft, setCollapsedLeft] = useState(false);
  const [copyStatus, setCopyStatus] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  const handleCopyResponse = () => {
    if (!aiResponse) return;
    navigator.clipboard.writeText(aiResponse);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const handleSaveOutput = async () => {
    if (!aiResponse) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `epitelos_output_${timestamp}.md`;

    // @ts-ignore
    if (isDesktop && window.__TAURI__) {
      try {
        // @ts-ignore
        const filePath = await window.__TAURI__.dialog.save({ defaultPath: defaultFilename, filters: [{ name: 'Markdown', extensions: ['md', 'txt'] }] });
        if (filePath) {
          // @ts-ignore
          await window.__TAURI__.fs.writeTextFile(filePath, aiResponse);
        }
      } catch (error) {
        console.error('Failed to save file:', error);
      }
    } else {
      const blob = new Blob([aiResponse], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const selectedFunction = functions.find(f => f.id === selectedFunctionId);

  return (
    <div className="runner-page h-full flex flex-col">
      <header className="page-heading runner-heading">
        <div><p className="eyebrow">{t('WORKSPACE / NEW SESSION')}</p><h1>{t('Think with clarity.')}</h1><p className="page-subtitle">{t('Choose a function, bring in your sources, and start a focused run.')}</p></div>
        <span className="heading-badge">{t('NEW SESSION')}</span>
      </header>

      <div className="runner-layout flex flex-grow min-h-0 z-10 gap-5">
        {/* Control Hub Aside */}
        <aside
          className={`runner-controls flex flex-col overflow-hidden flex-shrink-0 transition-all duration-300 ${collapsedLeft ? 'w-0 opacity-0 pointer-events-none' : 'w-[40%] max-w-[500px] opacity-100'}`}
        >
          <ControlHub
            functions={functions}
            contexts={contexts}
            selectedFunctionId={selectedFunctionId}
            setSelectedFunctionId={setSelectedFunctionId}
            selectedContextIds={selectedContextIds}
            setSelectedContextIds={setSelectedContextIds}
            userInput={userInput}
            setUserInput={setUserInput}
            isLoading={isLoading}
            onRun={() => { onRun(); onSaveSession(); }}
            onStop={onStop}
            isStreaming={isStreaming}
            setIsStreaming={setIsStreaming}
            showReasoning={showReasoning}
            setShowReasoning={setShowReasoning}
            selectedModel={selectedModel}
            onSelectModel={onSelectModel}
            availableModels={availableModels}
            setShowSystemPrompt={setShowSystemPrompt}
            handleViewContext={handleViewContext}
          />
        </aside>

        {/* Divider Toggle */}
        <div className="relative flex items-center justify-center w-4 flex-shrink-0 z-20">
          <button
            onClick={() => setCollapsedLeft(!collapsedLeft)}
            className="runner-divider-toggle absolute top-1/2 -translate-y-1/2 w-5 h-10 flex items-center justify-center transition-all"
            aria-label={t(collapsedLeft ? 'Show setup panel' : 'Hide setup panel')}
          >
            <ChevronRightIcon className={`w-3.5 h-3.5 transition-transform duration-500 ${collapsedLeft ? '' : 'rotate-180'}`} />
          </button>
        </div>

        {/* Response Main Area */}
        <main className="runner-output flex flex-col flex-grow min-w-0 overflow-hidden relative">
          <ResponseTerminal
            aiResponse={aiResponse}
            runError={runError}
            isLoading={isLoading}
            isStreaming={isStreaming}
            onCopy={handleCopyResponse}
            onExport={handleSaveOutput}
            copyStatus={copyStatus}
          />
        </main>
      </div>

      {/* System Prompt Modal */}
      {selectedFunction && (
        <Modal
          isOpen={showSystemPrompt}
          onClose={() => setShowSystemPrompt(false)}
          title={`${t('System prompt: ')}${selectedFunction.name}`}
        >
          <div className="space-y-6 p-1">
            <p className="text-sm text-neutral-400">{t('Instructions used by this function')}</p>
            <div className="bg-neutral-950 rounded-2xl p-6 border border-white/10 font-mono text-[11px] text-neutral-200 leading-relaxed max-h-[65vh] overflow-y-auto custom-scrollbar whitespace-pre-wrap shadow-inner selection:bg-neutral-500/40">
              {selectedFunction.systemPrompt}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
