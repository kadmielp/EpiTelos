

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
  // State and refs for the resizable panel
  const [panelWidth, setPanelWidth] = useState(50); // percentage
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const responsePanelRef = useRef<HTMLDivElement>(null);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const modelSelectorRef = useRef<HTMLDivElement>(null);

  // Effect for model selector click-outside-to-close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
            setIsModelSelectorOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modelSelectorRef]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Calculate new width as a percentage of the container's width
    const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
    
    // Clamp the width between 25% and 75%
    if (newWidth >= 25 && newWidth <= 75) {
      setPanelWidth(newWidth);
    }
  }, []);

  useEffect(() => {
    // Add event listeners to the window to handle dragging anywhere on the page
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Cleanup function to remove listeners when the component unmounts
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Effect to automatically scroll the AI response panel to the bottom during streaming
  useEffect(() => {
    if (isStreaming && responsePanelRef.current) {
      const element = responsePanelRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [aiResponse, isStreaming]);


  const handleContextToggle = (node: TreeNode, isChecked: boolean) => {
    // Get all file IDs under this node. If the node is a file, it will be an empty array.
    let fileIdsInSubtree = getDescendantSourceIds(node);
    
    // If the node itself is a file source, add its own ID to the list.
    if (node.source) {
      fileIdsInSubtree.push(node.source.id);
    }
    
    const uniqueFileIds = [...new Set(fileIdsInSubtree)];

    let newSelection;
    if (isChecked) {
        newSelection = [...new Set([...selectedContextIds, ...uniqueFileIds])];
    } else {
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

    // @ts-ignore
    if (isDesktop && window.__TAURI__) {
      try {
        // @ts-ignore
        const filePath = await window.__TAURI__.dialog.save({
          defaultPath: defaultFilename,
          filters: [{
            name: 'Markdown',
            extensions: ['md', 'txt']
          }]
        });

        if (filePath) {
          // @ts-ignore
          await window.__TAURI__.fs.writeTextFile(filePath, aiResponse);
        }
      } catch (error) {
        console.error("Failed to save file:", error);
        alert("An error occurred while saving the file. Please check the console for more details.");
      }
    } else {
      // Standard web download
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
    <div className="p-6 h-full flex flex-col">
      <h2 className="text-3xl font-bold text-white mb-6">Run AI</h2>
      <div ref={containerRef} className="flex flex-col lg:flex-row gap-2 flex-grow min-h-0">
        {/* Left Side: Configuration */}
        <div 
          className="flex flex-col bg-slate-800 rounded-lg lg:flex-shrink-0 overflow-hidden"
          style={{ flexBasis: `${panelWidth}%` }}
        >
          {/* --- SCROLLABLE AREA --- */}
          <div className="flex-grow p-4 space-y-4 overflow-y-auto">
            <div>
              <label htmlFor="function-select" className="block text-sm font-medium text-slate-300 mb-1">
                AI Function
              </label>
              <select
                id="function-select"
                value={selectedFunctionId ?? ''}
                onChange={(e) => setSelectedFunctionId(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm p-2 text-white focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="" disabled>Select a function</option>
                {builtInFunctions.length > 0 && <optgroup label="Built-in Functions">
                    {builtInFunctions.map(func => (
                      <option key={func.id} value={func.id}>{func.name}</option>
                    ))}
                  </optgroup>}
                {customFunctions.length > 0 && <optgroup label="Custom Functions">
                    {customFunctions.map(func => (
                      <option key={func.id} value={func.id}>{func.name}</option>
                    ))}
                  </optgroup>}
              </select>
            </div>
            
            {selectedFunction && (
              <div className="text-xs p-3 bg-slate-900 rounded-md text-slate-400 max-h-32 overflow-y-auto">
                <p className="font-bold">System Prompt:</p>
                <p className="whitespace-pre-wrap">{selectedFunction.systemPrompt}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Context Sources
              </label>
              <div className="bg-slate-700 border border-slate-600 rounded-md p-3 max-h-48 overflow-y-auto space-y-1">
                {contexts.length > 0 ? (
                  <ContextTreeView
                    contexts={contexts}
                    renderNode={(node, isExpanded, toggleExpand) => {
                        const allDescendantFiles = getDescendantSourceIds(node);
                        if (node.source) {
                            allDescendantFiles.push(node.source.id);
                        }
                        const uniqueFiles = [...new Set(allDescendantFiles)];

                        const isChecked = uniqueFiles.length > 0 && uniqueFiles.every(id => selectedContextIds.includes(id));
                        const isIndeterminate = uniqueFiles.length > 0 && !isChecked && uniqueFiles.some(id => selectedContextIds.includes(id));
                        
                        const isFolder = !node.source;
                        const nodeType = isFolder ? 'folder' : 'file';
                        const nodeRemark = node.source?.remark || node.name;
                        const nodeId = node.source?.id || node.id;
                        const nodePath = node.source?.path || node.id;

                      return (
                          <div className="flex items-center justify-between w-full p-1 rounded-md hover:bg-slate-600 transition-colors">
                              <div className="flex items-center flex-grow min-w-0">
                                  <input
                                      id={`ctx-run-${nodeId}`}
                                      type="checkbox"
                                      checked={isChecked}
                                      ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                                      onChange={(e) => handleContextToggle(node, e.target.checked)}
                                      className="h-4 w-4 rounded border-slate-500 bg-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <label htmlFor={`ctx-run-${nodeId}`} className="ml-2 text-sm text-slate-200 flex items-center cursor-pointer select-none truncate" title={nodePath}>
                                      <span className={`mr-2 text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0 ${nodeType === 'folder' ? 'bg-sky-900 text-sky-300' : 'bg-emerald-900 text-emerald-300'}`}>
                                          {nodeType === 'folder' ? 'DIR' : 'FILE'}
                                      </span>
                                      <span className="truncate">{nodeRemark}</span>
                                  </label>
                              </div>
                              {node.source && (
                                  <button
                                      onClick={(e) => { e.stopPropagation(); handleViewContext(node.source!.id); }}
                                      className="p-1 text-slate-400 hover:text-white rounded-md transition-colors flex-shrink-0"
                                      title={`View content of ${nodeRemark}`}
                                  >
                                      <ExternalLinkIcon className="w-5 h-5" />
                                  </button>
                              )}
                          </div>
                      );
                    }}
                  />
                ) : <p className="text-slate-400 text-sm p-2 text-center">No context sources added. Go to Context Manager.</p>}
              </div>
            </div>

            <div>
              <label htmlFor="user-input" className="block text-sm font-medium text-slate-300 mb-1">
                User Input / Prompt
              </label>
              <textarea
                id="user-input"
                rows={1}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm p-2 text-white focus:ring-blue-500 focus:border-blue-500"
                placeholder="Provide any additional thoughts, questions, or context here..."
              />
            </div>
          </div>
          
          {/* --- FIXED FOOTER AREA --- */}
          <div className="flex-shrink-0 p-4 border-t border-slate-700/50">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                {/* Model Selector Dropdown */}
                <div ref={modelSelectorRef} className="relative">
                    <button 
                        onClick={() => setIsModelSelectorOpen(prev => !prev)} 
                        disabled={availableModels.length === 0}
                        className="text-sm text-slate-400 bg-slate-900 px-3 py-1.5 rounded-md whitespace-nowrap hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:cursor-not-allowed disabled:hover:bg-slate-900"
                        aria-haspopup="true"
                        aria-expanded={isModelSelectorOpen}
                    >
                        <span>Model: <span className="font-semibold text-slate-300">{selectedModel || 'N/A'}</span></span>
                        {availableModels.length > 0 && <ChevronDownIcon className={`w-4 h-4 transition-transform ${isModelSelectorOpen ? 'rotate-180' : ''}`} />}
                    </button>
                    {isModelSelectorOpen && availableModels.length > 0 && (
                        <div className="absolute bottom-full mb-2 w-full bg-slate-700 rounded-md shadow-lg z-10 p-1 border border-slate-600 max-h-48 overflow-y-auto">
                            <ul className="space-y-1">
                                {availableModels.map(model => (
                                    <li key={model}>
                                        <button 
                                            onClick={() => {
                                                onSelectModel(model);
                                                setIsModelSelectorOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${selectedModel === model ? 'bg-blue-600 text-white font-semibold' : 'text-slate-200 hover:bg-slate-600'}`}
                                        >
                                            {model}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Toggles Group */}
                <div className="flex items-center gap-4 sm:gap-6 p-2 rounded-lg bg-slate-900/50">
                    {/* Remove Thinking Tags Checkbox */}
                    <label className="flex items-center cursor-pointer text-sm text-slate-300 font-medium">
                        <input 
                            type="checkbox" 
                            checked={removeThinkingTags} 
                            onChange={e => setRemoveThinkingTags(e.target.checked)} 
                            className="h-4 w-4 bg-slate-600 border-slate-500 text-blue-600 focus:ring-blue-500 rounded"
                        />
                        <span className="ml-2">Hide "Thinking"</span>
                    </label>

                    <div className="w-px h-5 bg-slate-600"></div>

                    {/* Stream Toggle */}
                    <label htmlFor="stream-toggle" className="flex items-center cursor-pointer">
                        <span className="mr-3 text-slate-300 text-sm font-medium">Stream</span>
                        <div className="relative">
                            <input 
                                type="checkbox" 
                                id="stream-toggle" 
                                className="sr-only peer" 
                                checked={isStreaming} 
                                onChange={e => setIsStreaming(e.target.checked)} 
                            />
                            <div className="w-12 h-6 bg-slate-600 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                            <div className="absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-full"></div>
                        </div>
                    </label>
                </div>
            </div>
            
            {isLoading ? (
                 <button
                    onClick={onStop}
                    className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-md hover:bg-red-700 transition-colors flex justify-center items-center gap-2"
                >
                    <StopIcon className="w-5 h-5" />
                    Stop Generation
                </button>
            ) : (
                <button
                    onClick={handleRunClick}
                    disabled={!selectedFunctionId || !selectedModel}
                    className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors flex justify-center items-center"
                >
                    Run Function
                </button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div
          onMouseDown={handleMouseDown}
          className="hidden lg:flex w-2 flex-shrink-0 items-center justify-center bg-transparent group cursor-col-resize"
          title="Drag to resize"
        >
          <div className="w-1 h-12 bg-slate-700 rounded-full group-hover:bg-blue-600 transition-colors"></div>
        </div>


        {/* Right Side: Output */}
        <div className="flex flex-col bg-slate-800 p-4 rounded-lg overflow-hidden flex-grow mt-2 lg:mt-0">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-bold text-white">AI Response</h3>
            <button
              onClick={handleSaveOutput}
              disabled={!aiResponse || isLoading}
              className="bg-green-600 text-white font-bold py-1 px-3 text-xs rounded-md hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              <SaveIcon className="w-4 h-4" />
              Save Output
            </button>
          </div>
          <div ref={responsePanelRef} className="bg-slate-900 rounded-md p-4 flex-grow overflow-y-auto">
            {isLoading && !aiResponse && <p className="text-slate-400">Waiting for response...</p>}
            {aiResponse ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <Markdown>{aiResponse}</Markdown>
              </div>
            ) : (
              !isLoading && <p className="text-slate-500">Output will appear here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
