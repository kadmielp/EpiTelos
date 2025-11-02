import React, { useState, useRef, useCallback, useEffect } from 'react';
import { IAIFunction, IContextSource, TreeNode } from '../types';
import Markdown from 'react-markdown';
import { SaveIcon } from './icons/SaveIcon';
import { ExternalLinkIcon } from './icons/ExternalLinkIcon';
import { ContextTreeView, getDescendantSourceIds } from './ContextTreeView';
import { FolderIcon } from './icons/FolderIcon';
import { StopIcon } from './icons/StopIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface FunctionRunnerProps {
  functions: IAIFunction[];
  contexts: IContextSource[];
  selectedFunctionId: string | null;
  setSelectedFunctionId: (id: string) => void;
  selectedContextIds: string[];
  setSelectedContextIds: (ids: string[]) => void;
  userInput: string;
  setUserInput: (input: string) => void;
  aiResponse: string;
  isLoading: boolean;
  onRun: () => void;
  onStop: () => void;
  onSaveSession: () => void;
  handleViewContext: (id: string) => void;
  isStreaming: boolean;
  setIsStreaming: (isStreaming: boolean) => void;
  removeThinkingTags: boolean;
  setRemoveThinkingTags: (remove: boolean) => void;
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
  isLoading,
  onRun,
  onStop,
  onSaveSession,
  handleViewContext,
  isStreaming,
  setIsStreaming,
  removeThinkingTags,
  setRemoveThinkingTags,
  selectedModel,
  onSelectModel,
  availableModels,
  isDesktop
}) => {
  // Responsive panel state
  const [panelWidth, setPanelWidth] = useState(40); // percentage of container for left panel
  const [collapsedLeft, setCollapsedLeft] = useState(false);
  const [isActivelyResizing, setIsActivelyResizing] = useState(false);

  // Refs for drag + accessibility
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const responsePanelRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);

  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const modelSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setIsModelSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    setIsActivelyResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    // focus the divider for keyboard resize
    dividerRef.current?.focus();
  };

  const handleMouseUp = useCallback(() => {
    if (!isResizing.current) return;
    isResizing.current = false;
    setIsActivelyResizing(false);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;
    
    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(25, Math.min(75, newWidth));
      setPanelWidth(clamped);
    });
  }, []);

  // Keyboard accessibility for the divider: ArrowLeft/ArrowRight and Enter to toggle collapse
  const handleDividerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setPanelWidth(w => Math.max(25, w - 2));
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      setPanelWidth(w => Math.min(75, w + 2));
      e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') {
      setCollapsedLeft(prev => !prev);
      e.preventDefault();
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && responsePanelRef.current) {
      const el = responsePanelRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [aiResponse, isStreaming]);

  // Context toggle logic unchanged
  const handleContextToggle = (node: TreeNode, isChecked: boolean) => {
    let fileIdsInSubtree = getDescendantSourceIds(node);
    if (node.source) fileIdsInSubtree.push(node.source.id);
    const uniqueFileIds = [...new Set(fileIdsInSubtree)];

    let newSelection;
    if (isChecked) newSelection = [...new Set([...selectedContextIds, ...uniqueFileIds])];
    else {
      const idsToRemove = new Set(uniqueFileIds);
      newSelection = selectedContextIds.filter(id => !idsToRemove.has(id));
    }
    setSelectedContextIds(newSelection);
  };

  const handleRunClick = () => {
    onRun();
    onSaveSession();
  };

  const handleSaveOutput = async () => {
    if (!aiResponse) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `epitelos_output_${timestamp}.md`;

    // Desktop/tauri support preserved
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
        alert('An error occurred while saving the file. Please check the console for more details.');
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
  const builtInFunctions = functions.filter(f => !f.isCustom);
  const customFunctions = functions.filter(f => f.isCustom);

  return (
    <div className="p-4 h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative">
      {/* Compact header */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Run AI</h2>
          <div className="h-0.5 w-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-1" />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCollapsedLeft(prev => !prev)}
            className="text-sm px-3 py-2 rounded-lg bg-slate-800/70 text-slate-200 hover:bg-slate-700/80 transition-all duration-200 border border-slate-700/50 hover:border-slate-600/50 shadow-lg flex items-center gap-2"
            aria-pressed={collapsedLeft}
            aria-label={collapsedLeft ? 'Expand configuration panel' : 'Collapse configuration panel'}
          >
            <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${collapsedLeft ? '-rotate-90' : 'rotate-90'}`} />
            {collapsedLeft ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Floating expand button when collapsed */}
      {collapsedLeft && (
        <div className="fixed left-4 top-1/2 -translate-y-1/2 z-10 animate-in fade-in slide-in-from-left-5 duration-300">
          <button
            onClick={() => setCollapsedLeft(false)}
            className="bg-gradient-to-r from-slate-800/95 to-slate-900/95 backdrop-blur-xl p-3 rounded-r-xl border border-l-0 border-slate-700/50 hover:from-slate-700/95 hover:to-slate-800/95 transition-all duration-300 shadow-2xl hover:shadow-blue-500/20 group"
            aria-label="Expand configuration panel"
            title="Expand configuration panel"
          >
            <ChevronDownIcon className="w-5 h-5 rotate-90 text-slate-400 group-hover:text-blue-400 transition-colors" />
          </button>
        </div>
      )}

      <div ref={containerRef} className="flex gap-4 flex-grow min-h-0">
        {/* Left Configuration Panel */}
        <aside
          aria-hidden={collapsedLeft}
          className={`flex flex-col bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-xl overflow-hidden border shadow-2xl flex-shrink-0 ${
            isActivelyResizing ? 'will-change-[width]' : 'transition-all duration-300 ease-in-out'
          } ${
            collapsedLeft 
              ? 'w-0 opacity-0 p-0 pointer-events-none border-0' 
              : 'min-w-[280px] border-slate-700/50 opacity-100'
          }`}
          style={{ width: collapsedLeft ? 0 : `${panelWidth}%`, maxWidth: collapsedLeft ? 0 : '75%' }}
        >
          <div className="flex-grow p-4 space-y-4 overflow-y-auto custom-scrollbar">
            {/* AI Function selector */}
            <div className="space-y-2">
              <label htmlFor="function-select" className="block text-xs font-semibold text-slate-200 uppercase tracking-wide">AI Function</label>
              <select
                id="function-select"
                value={selectedFunctionId ?? ''}
                onChange={(e) => setSelectedFunctionId(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300 hover:bg-slate-800"
                aria-label="Select AI function"
              >
                <option value="" disabled>Select a function</option>
                {builtInFunctions.length > 0 && (
                  <optgroup label="Built-in Functions">
                    {builtInFunctions.map(func => (
                      <option key={func.id} value={func.id}>{func.name}</option>
                    ))}
                  </optgroup>
                )}
                {customFunctions.length > 0 && (
                  <optgroup label="Custom Functions">
                    {customFunctions.map(func => (
                      <option key={func.id} value={func.id}>{func.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {selectedFunction && (
              <div className="text-xs p-3 bg-gradient-to-br from-slate-900/90 to-slate-950/90 rounded-lg text-slate-300 max-h-28 overflow-y-auto border border-slate-700/30 shadow-inner backdrop-blur-sm custom-scrollbar">
                <p className="font-bold text-blue-400 mb-1.5 uppercase tracking-wider text-[10px]">System Prompt</p>
                <p className="whitespace-pre-wrap leading-relaxed text-[11px]">{selectedFunction.systemPrompt}</p>
              </div>
            )}

            {/* Context sources */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wide">Context Sources</label>
              <div className="bg-slate-800/60 border border-slate-600/40 rounded-lg p-3 max-h-48 overflow-y-auto backdrop-blur-sm shadow-inner custom-scrollbar">
                {contexts.length > 0 ? (
                  <ContextTreeView
                    contexts={contexts}
                    renderNode={(node, isExpanded, toggleExpand) => {
                      const allDescendantFiles = getDescendantSourceIds(node);
                      if (node.source) allDescendantFiles.push(node.source.id);
                      const uniqueFiles = [...new Set(allDescendantFiles)];

                      const isChecked = uniqueFiles.length > 0 && uniqueFiles.every(id => selectedContextIds.includes(id));
                      const isIndeterminate = uniqueFiles.length > 0 && !isChecked && uniqueFiles.some(id => selectedContextIds.includes(id));

                      const isFolder = !node.source;
                      const nodeType = isFolder ? 'folder' : 'file';
                      const nodeRemark = node.source?.remark || node.name;
                      const nodeId = node.source?.id || node.id;
                      const nodePath = node.source?.path || node.id;

                      return (
                        <div className="flex items-center justify-between w-full p-1.5 rounded-lg hover:bg-slate-700/60 transition-all duration-200 group">
                          <div className="flex items-center min-w-0 flex-grow">
                            <input
                              id={`ctx-run-${nodeId}`}
                              type="checkbox"
                              checked={isChecked}
                              ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                              onChange={(e) => handleContextToggle(node, e.target.checked)}
                              className="h-3.5 w-3.5 rounded-md border-2 border-slate-500 bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer transition-all"
                              style={{ accentColor: '#2563eb' }}
                            />
                            <label htmlFor={`ctx-run-${nodeId}`} className="ml-2 text-xs text-slate-200 flex items-center cursor-pointer select-none truncate flex-grow" title={nodePath}>
                              <span className={`mr-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 uppercase tracking-wider transition-all ${nodeType === 'folder' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                                {nodeType === 'folder' ? 'DIR' : 'FILE'}
                              </span>
                              <span className="truncate font-medium">{nodeRemark}</span>
                            </label>
                          </div>
                          {node.source && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleViewContext(node.source!.id); }}
                              className="p-1 text-slate-400 hover:text-blue-400 rounded-md transition-all duration-200 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:bg-slate-600/50"
                              title={`View content of ${nodeRemark}`}
                            >
                              <ExternalLinkIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    }}
                  />
                ) : (
                  <div className="text-slate-400 text-xs p-4 text-center">
                    <p className="mb-1">No context sources added</p>
                    <p className="text-[10px] text-slate-500">Go to Context Manager to add sources</p>
                  </div>
                )}
              </div>
            </div>

            {/* User prompt */}
            <div className="space-y-2">
              <label htmlFor="user-input" className="block text-xs font-semibold text-slate-200 uppercase tracking-wide">User Input / Prompt</label>
              <textarea
                id="user-input"
                rows={2}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all duration-300 hover:bg-slate-800 backdrop-blur-sm custom-scrollbar placeholder:text-slate-500"
                placeholder="Provide any additional thoughts, questions, or context here..."
              />
            </div>
          </div>

          {/* Footer - compact with primary action */}
          <div className="flex-shrink-0 p-4 border-t border-slate-700/50 bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div ref={modelSelectorRef} className="relative">
                <button
                  onClick={() => setIsModelSelectorOpen(prev => !prev)}
                  disabled={availableModels.length === 0}
                  className="text-xs text-slate-300 bg-slate-800/80 px-3 py-2 rounded-lg whitespace-nowrap hover:bg-slate-700/80 transition-all duration-200 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 border border-slate-600/40 shadow-lg backdrop-blur-sm"
                  aria-haspopup="listbox"
                  aria-expanded={isModelSelectorOpen}
                >
                  <span className="text-slate-400">Model:</span>
                  <span className="font-semibold text-white">{selectedModel || 'N/A'}</span>
                  {availableModels.length > 0 && <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-300 ${isModelSelectorOpen ? 'rotate-180' : ''}`} />}
                </button>

                {isModelSelectorOpen && availableModels.length > 0 && (
                  <div className="absolute bottom-full mb-2 w-full min-w-max bg-slate-800/95 rounded-lg shadow-2xl z-10 p-1.5 border border-slate-600/50 max-h-48 overflow-y-auto backdrop-blur-xl custom-scrollbar animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <ul role="listbox" className="space-y-0.5">
                      {availableModels.map(model => (
                        <li key={model}>
                          <button
                            onClick={() => { onSelectModel(model); setIsModelSelectorOpen(false); }}
                            className={`w-full text-left px-3 py-2 rounded-md text-xs transition-all duration-200 ${selectedModel === model ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold shadow-lg' : 'text-slate-200 hover:bg-slate-700/70'}`}
                          >
                            {model}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 p-2 rounded-lg bg-slate-800/60 border border-slate-700/40 backdrop-blur-sm">
                <label className="flex items-center cursor-pointer text-xs text-slate-300 font-medium group">
                  <input 
                    type="checkbox" 
                    checked={removeThinkingTags} 
                    onChange={e => setRemoveThinkingTags(e.target.checked)} 
                    className="h-3.5 w-3.5 bg-slate-700 border-2 border-slate-500 focus:ring-2 focus:ring-blue-500 rounded-md transition-all"
                    style={{ accentColor: '#2563eb' }}
                  />
                  <span className="ml-2 group-hover:text-white transition-colors">Hide "Thinking"</span>
                </label>

                <div className="w-px h-5 bg-slate-600/50"></div>

                <label htmlFor="stream-toggle" className="flex items-center cursor-pointer group">
                  <span className="mr-2 text-slate-300 text-xs font-medium group-hover:text-white transition-colors">Stream</span>
                  <div className="relative">
                    <input 
                      id="stream-toggle" 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={isStreaming} 
                      onChange={e => setIsStreaming(e.target.checked)} 
                    />
                    <div className="w-10 h-5 bg-slate-600 rounded-full peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-blue-500 transition-all duration-300 shadow-inner"></div>
                    <div className="absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-300 peer-checked:translate-x-5 shadow-lg"></div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              {isLoading ? (
                <button 
                  onClick={onStop} 
                  className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white font-bold py-2.5 px-4 rounded-lg hover:from-red-700 hover:to-red-600 transition-all duration-300 flex justify-center items-center gap-2 shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] text-sm"
                >
                  <StopIcon className="w-4 h-4" />
                  Stop Generation
                </button>
              ) : (
                <button 
                  onClick={handleRunClick} 
                  disabled={!selectedFunctionId || !selectedModel} 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-2.5 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all duration-300 flex justify-center items-center shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] disabled:hover:scale-100"
                >
                  Run Function
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Divider / Resizer - Enhanced */}
        {!collapsedLeft && (
          <div
            ref={dividerRef}
            role="separator"
            tabIndex={0}
            aria-orientation="vertical"
            aria-label="Resize configuration panel. Use arrow keys to adjust width, Enter to collapse."
            onMouseDown={handleMouseDown}
            onKeyDown={handleDividerKeyDown}
            className="group flex items-center justify-center w-3 flex-shrink-0 cursor-col-resize select-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded transition-all"
            title="Drag to resize, use arrow keys, or press Enter to collapse"
          >
            <div className={`w-1 h-20 rounded-full shadow-lg transition-all duration-300 ${
              isActivelyResizing 
                ? 'bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 scale-110' 
                : 'bg-gradient-to-b from-slate-700 via-slate-600 to-slate-700 group-hover:from-blue-500 group-hover:via-purple-500 group-hover:to-pink-500 group-focus:from-blue-500 group-focus:via-purple-500 group-focus:to-pink-500'
            }`} />
          </div>
        )}

        {/* Right (output) panel */}
        <main className="flex flex-col bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-4 rounded-xl overflow-hidden flex-1 min-w-0 border border-slate-700/50 shadow-2xl">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">AI Response</h3>
              <p className="text-xs text-slate-400">Results and generated content appear here</p>
            </div>
            <div>
              <button 
                onClick={handleSaveOutput} 
                disabled={!aiResponse || isLoading} 
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-1.5 px-3 text-xs rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-1.5 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 disabled:hover:scale-100"
              >
                <SaveIcon className="w-3.5 h-3.5" />
                Save Output
              </button>
            </div>
          </div>

          <div 
            ref={responsePanelRef} 
            aria-live="polite" 
            className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 rounded-lg p-4 flex-grow overflow-y-auto border border-slate-700/30 shadow-inner backdrop-blur-sm custom-scrollbar min-h-[200px]"
          >
            {isLoading && !aiResponse && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="inline-block w-10 h-10 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin mb-3" />
                  <p className="text-sm text-slate-400 font-medium">Generating response...</p>
                </div>
              </div>
            )}

            {aiResponse ? (
              <div className="prose prose-invert prose-sm max-w-none prose-headings:text-transparent prose-headings:bg-gradient-to-r prose-headings:from-blue-400 prose-headings:to-purple-400 prose-headings:bg-clip-text prose-a:text-blue-400 prose-code:text-pink-400 prose-pre:bg-slate-950/50 prose-pre:border prose-pre:border-slate-700/50">
                <Markdown>{aiResponse}</Markdown>
              </div>
            ) : (
              !isLoading && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-500 text-center">
                    <span className="block text-4xl mb-3 opacity-20">✨</span>
                    <span className="text-sm font-medium">Output will appear here</span>
                  </p>
                </div>
              )
            )}
          </div>
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15,23,42,0.3); border-radius:10px }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(to bottom, rgb(71,85,105), rgb(51,65,85)); border-radius:10px }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: linear-gradient(to bottom, rgb(59,130,246), rgb(147,51,234)); }
        
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-left-5 { from { transform: translateX(-1.25rem) translateY(-50%); } to { transform: translateX(0) translateY(-50%); } }
        @keyframes slide-in-from-bottom-2 { from { transform: translateY(0.5rem); } to { transform: translateY(0); } }
        
        .animate-in { animation-duration: 0.3s; animation-fill-mode: both; }
        .fade-in { animation-name: fade-in; }
        .slide-in-from-left-5 { animation-name: slide-in-from-left-5; }
        .slide-in-from-bottom-2 { animation-name: slide-in-from-bottom-2; }
        
        input[type="checkbox"]:checked {
          background-color: rgb(37, 99, 235) !important;
          border-color: rgb(59, 130, 246) !important;
          accent-color: rgb(37, 99, 235);
        }
      `}</style>
    </div>
  );
};