import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { IAIFunction, IContextSource, TreeNode } from '../types';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SaveIcon } from './icons/SaveIcon';
import { ExternalLinkIcon } from './icons/ExternalLinkIcon';
import { ContextTreeView, getDescendantSourceIds } from './ContextTreeView';
import { FolderIcon } from './icons/FolderIcon';
import { StopIcon } from './icons/StopIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { Modal } from './Modal';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';
import { PlayIcon } from './icons/PlayIcon';
import { BrainIcon } from './icons/BrainIcon';
import mermaid from 'mermaid';

// Initialize Mermaid with premium styling
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  logLevel: 'error',
  // @ts-ignore
  suppressErrorConsole: true,
  themeVariables: {
    fontFamily: '"Outfit", "Inter", sans-serif',
    primaryColor: '#3b82f6',
    primaryTextColor: '#fff',
    primaryBorderColor: '#3b82f6',
    lineColor: '#64748b',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
    mainBkg: '#0f172a',
    nodeBorder: '#334155',
    clusterBkg: '#1e293b',
    titleColor: '#94a3b8',
    edgeLabelBackground: '#1e293b',
    nodeTextColor: '#f1f5f9'
  }
});

const MermaidDiagram = React.memo<{ content: string }>(({ content }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!content || content.length < 10) return;

      // Basic heuristic: if it's currently being streamed and looks incomplete, wait
      // (e.g. if it ends with a character that implies more is coming in common mermaid syntax)
      if (content.trim().endsWith('-') || content.trim().endsWith('|')) return;

      try {
        const cleanContent = content.trim();
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;

        // Use parse instead of render first to check for errors silently
        const isValid = await mermaid.parse(cleanContent, { suppressErrors: true });
        if (!isValid) {
          setError(true);
          return;
        }

        const { svg } = await mermaid.render(id, cleanContent);
        setSvg(svg);
        setError(false);
      } catch (err) {
        // Silently fail during streaming - we only want to show the diagram when it's valid
        setError(true);
      }
    };

    renderDiagram();
  }, [content]);

  if (error && !svg) {
    // While streaming or if invalid, just show a loading state/placeholder
    // only show a subtle error if it's clearly stopped and still invalid
    return null;
  }

  if (!svg) return (
    <div className="flex flex-col items-center justify-center h-32 w-full bg-white/5 rounded-2xl border border-dashed border-white/10 my-6 animate-pulse">
      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-3" />
      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Constructing Diagram...</span>
    </div>
  );

  return (
    <div
      className="flex justify-center my-6 overflow-x-auto rounded-3xl bg-slate-900/40 backdrop-blur-sm p-8 border border-white/5 shadow-2xl transition-all hover:border-blue-500/20 group relative custom-scrollbar"
    >
      <div className="absolute top-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[9px] font-bold text-blue-500/50 uppercase tracking-widest">Interactive Diagram</span>
      </div>
      <div
        className="w-full h-full flex justify-center"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
});

// Collapsible Thinking Block Component
const ThinkingBlock = React.memo<{ content: string }>(({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-4 border border-slate-700/50 rounded-xl overflow-hidden bg-slate-900/30">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BrainIcon className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-slate-400">Reasoning Process</span>
        </div>
        <ChevronDownIcon
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700/30">
          <pre className="text-xs text-slate-500 whitespace-pre-wrap font-mono leading-relaxed mt-3 max-h-[400px] overflow-y-auto custom-scrollbar">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
});

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
  // Panel state
  const [collapsedLeft, setCollapsedLeft] = useState(false);
  const [copyStatus, setCopyStatus] = useState<boolean>(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const responsePanelRef = useRef<HTMLDivElement>(null);

  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const modelSelectorRef = useRef<HTMLDivElement>(null);

  const [isFunctionDropdownOpen, setIsFunctionDropdownOpen] = useState(false);
  const [functionSearchQuery, setFunctionSearchQuery] = useState('');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const functionDropdownRef = useRef<HTMLDivElement>(null);

  // Parse response to extract thinking blocks
  const parsedResponse = useMemo(() => {
    if (!aiResponse) return { thinkingContent: null, mainContent: '' };

    const thinkMatch = aiResponse.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
      const thinkingContent = thinkMatch[1].trim();
      const mainContent = aiResponse.replace(/<think>[\s\S]*?<\/think>\s*/, '').trim();
      return { thinkingContent, mainContent };
    }

    // Check if thinking is still in progress (has opening tag but no closing tag)
    if (aiResponse.includes('<think>') && !aiResponse.includes('</think>')) {
      const thinkingContent = aiResponse.replace('<think>', '').trim();
      return { thinkingContent, mainContent: '', isThinkingInProgress: true };
    }

    return { thinkingContent: null, mainContent: aiResponse };
  }, [aiResponse]);

  // Memoize markdown components to prevent flickering on every parent re-render
  const markdownComponents = useMemo(() => ({
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const content = String(children).replace(/\n$/, '');

      if (!inline && language === 'mermaid') {
        return <MermaidDiagram content={content} />;
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
  }), []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setIsModelSelectorOpen(false);
      }
      if (functionDropdownRef.current && !functionDropdownRef.current.contains(event.target as Node)) {
        setIsFunctionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll logic: Only scroll if content changed while we are actively loading/streaming
  useEffect(() => {
    if (isLoading && isStreaming && responsePanelRef.current) {
      const el = responsePanelRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [aiResponse, isLoading, isStreaming]);

  // Context toggle
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
  const filteredFunctions = functions.filter(f =>
    f.name.toLowerCase().includes(functionSearchQuery.toLowerCase()) ||
    (f.category && f.category.toLowerCase().includes(functionSearchQuery.toLowerCase())) ||
    (f.description && f.description.toLowerCase().includes(functionSearchQuery.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-200 selection:bg-blue-500/30">
      {/* Premium Gradient Backgrounds Overlay */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Main Content Area */}
      <div ref={containerRef} className="flex flex-grow min-h-0 z-10 p-3 pt-4 gap-3">
        {/* Configuration Panel */}
        <aside
          aria-hidden={collapsedLeft}
          className={`flex flex-col bg-slate-900/60 backdrop-blur-3xl rounded-2xl overflow-hidden border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${collapsedLeft ? 'w-0 opacity-0 pointer-events-none' : 'w-[40%] max-w-[500px] opacity-100'
            }`}
        >
          {/* Sidebar Header */}
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Control Hub</h2>
          </div>

          <div className="flex-grow overflow-y-auto custom-scrollbar p-5 space-y-3">
            {/* Function Selection Section */}
            <section className="space-y-3">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Active Function</label>

              <div ref={functionDropdownRef} className="relative">
                {/* Combined dropdown + description container */}
                <div className={`bg-slate-900/60 border border-white/10 overflow-hidden transition-all ${selectedFunction?.description ? 'rounded-t-xl' : 'rounded-xl'}`}>
                  <button
                    onClick={() => setIsFunctionDropdownOpen(!isFunctionDropdownOpen)}
                    className="w-full px-4 py-3 text-left transition-all hover:bg-slate-800/60 group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 overflow-hidden flex-grow min-w-0">
                      <p className={`text-sm font-semibold truncate ${selectedFunction ? 'text-white' : 'text-slate-500'}`}>
                        {selectedFunction ? selectedFunction.name : 'Select function...'}
                      </p>
                      {selectedFunction && (
                        <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-md whitespace-nowrap flex-shrink-0">
                          {selectedFunction.category || 'Standard'}
                        </span>
                      )}
                    </div>
                    <ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform duration-300 flex-shrink-0 ml-2 ${isFunctionDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {selectedFunction?.description && (
                  <div className="bg-slate-900/40 border-x border-b border-white/10 rounded-b-xl px-4 py-3 flex items-start justify-between gap-2">
                    <p className="text-xs text-slate-500 leading-relaxed italic line-clamp-2 flex-grow">
                      "{selectedFunction.description}"
                    </p>
                    <button
                      onClick={() => setShowSystemPrompt(true)}
                      className="p-1 rounded-lg hover:bg-white/10 text-slate-600 hover:text-blue-400 transition-all flex-shrink-0"
                      title="View System Prompt"
                    >
                      <ExternalLinkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {isFunctionDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-slate-900 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden backdrop-blur-3xl animate-in fade-in slide-in-from-top-2 flex flex-col max-h-[450px]">
                    <div className="p-3 border-b border-white/5">
                      <div className="relative">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search intelligence..."
                          value={functionSearchQuery}
                          onChange={(e) => setFunctionSearchQuery(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-4">
                      {Object.entries(
                        filteredFunctions.reduce((acc, f) => {
                          const cat = f.isCustom ? 'Custom Intelligence' : (f.category || 'General');
                          if (!acc[cat]) acc[cat] = [];
                          acc[cat].push(f);
                          return acc;
                        }, {} as Record<string, typeof functions>)
                      ).sort((a, b) => a[0].localeCompare(b[0])).map(([cat, funcs]) => (
                        <div key={cat}>
                          <p className="px-2 text-[9px] font-black uppercase tracking-widest text-slate-600 mb-1">{cat}</p>
                          {funcs.sort((a, b) => a.name.localeCompare(b.name)).map(f => (
                            <button
                              key={f.id}
                              onClick={() => { setSelectedFunctionId(f.id); setIsFunctionDropdownOpen(false); setFunctionSearchQuery(''); }}
                              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between group/item ${selectedFunctionId === f.id ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-slate-300'}`}
                            >
                              <span className="font-medium">{f.name}</span>
                              {selectedFunctionId === f.id && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
                            </button>
                          ))}
                        </div>
                      ))}
                      {filteredFunctions.length === 0 && (
                        <div className="py-8 text-center text-slate-600 text-xs italic">No matching functions found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Context Knowledge Section */}
            <section className="space-y-3">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Knowledge Sources</label>
              <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-2 max-h-[280px] overflow-y-auto custom-scrollbar">
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

                      return (
                        <div className="flex items-center justify-between w-full px-2 py-1.5 rounded-xl hover:bg-white/5 group transition-colors">
                          <div className="flex items-center min-w-0 flex-grow">
                            <div className="relative flex items-center">
                              <input
                                id={`ctx-${node.id}`}
                                type="checkbox"
                                checked={isChecked}
                                ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                                onChange={(e) => handleContextToggle(node, e.target.checked)}
                                className="peer appearance-none h-4 w-4 rounded-lg bg-slate-800 border border-white/10 checked:bg-blue-600 checked:border-blue-500 transition-all cursor-pointer"
                              />
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white opacity-0 peer-checked:opacity-100 transition-opacity">
                                <CheckIcon className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                              {isIndeterminate && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-1.5 h-0.5 bg-white/50 rounded-full" /></div>}
                            </div>
                            <label htmlFor={`ctx-${node.id}`} className="ml-3 text-xs flex items-center min-w-0 cursor-pointer select-none">
                              <span className={`mr-2.5 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${isFolder ? 'bg-sky-500/10 text-sky-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                {isFolder ? 'DIR' : 'FILE'}
                              </span>
                              <span className={`truncate ${isChecked ? 'text-white' : 'text-slate-400'}`}>{node.source?.remark || node.name}</span>
                            </label>
                          </div>
                          {node.source && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleViewContext(node.source!.id); }}
                              className="p-1.5 text-slate-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <ExternalLinkIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    }}
                  />
                ) : (
                  <div className="py-10 text-center text-slate-600">
                    <p className="text-xs">No knowledge sources available</p>
                    <p className="text-[10px] mt-1 opacity-50 uppercase tracking-tighter">Add data in Context Manager</p>
                  </div>
                )}
              </div>
            </section>

            {/* Prompt Input */}
            <section className="space-y-2">
              <label htmlFor="user-input" className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Custom Instructions</label>
              <textarea
                id="user-input"
                rows={1}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Add more context to the AI, or leave it empty."
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-700 outline-none focus:border-blue-500/50 transition-all resize-none custom-scrollbar"
              />
            </section>
          </div>

          {/* Action Footer */}
          <div className="p-3 border-t border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 px-2.5 rounded-xl border border-white/5 backdrop-blur-2xl shadow-lg">
                {/* Model Selection */}
                {availableModels.length > 0 && (
                  <div ref={modelSelectorRef} className="relative flex items-center">
                    <button
                      onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                      className="text-[10px] bg-slate-800/50 hover:bg-slate-700/50 px-2.5 py-1.5 rounded-lg border border-white/5 transition-all flex items-center gap-2 group/btn"
                    >
                      <span className="text-slate-500 font-bold tracking-widest text-[9px]">MODEL</span>
                      <span className="text-blue-400 font-black truncate max-w-[100px]">{selectedModel || 'NONE'}</span>
                      <ChevronDownIcon className={`w-3.5 h-3.5 text-slate-500 group-hover/btn:text-blue-400 transition-transform duration-300 ${isModelSelectorOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isModelSelectorOpen && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-[0_-20px_50px_rgba(0,0,0,0.7)] z-[60] overflow-hidden backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-2">
                        <div className="p-1 px-4 text-[9px] font-black text-slate-500 uppercase py-2 border-b border-white/5 tracking-[0.2em] bg-white/[0.02]">Select Model</div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5">
                          {availableModels.map(m => (
                            <button
                              key={m}
                              onClick={() => { onSelectModel(m); setIsModelSelectorOpen(false); }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all mb-0.5 last:mb-0 ${selectedModel === m ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="w-px h-4 bg-white/10" />

                {/* Show Reasoning Toggle */}
                <button
                  onClick={() => setShowReasoning(!showReasoning)}
                  className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-white/5 transition-colors group"
                  title="For reasoning models"
                >
                  <div className={`w-7 h-3.5 rounded-full transition-all duration-300 relative ${showReasoning ? 'bg-blue-600' : 'bg-white/10'} border border-white/5`}>
                    <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all duration-300 shadow-md ${showReasoning ? 'left-[14px]' : 'left-0.5'}`} />
                  </div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 group-hover:text-slate-200 transition-colors whitespace-nowrap">Show Reasoning</span>
                </button>

                <div className="w-px h-3 bg-white/10" />

                {/* Stream Toggle */}
                <button
                  onClick={() => setIsStreaming(!isStreaming)}
                  className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <div className={`w-7 h-3.5 rounded-full transition-all duration-300 relative ${isStreaming ? 'bg-purple-600' : 'bg-white/10'} border border-white/5`}>
                    <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all duration-300 shadow-md ${isStreaming ? 'left-[14px]' : 'left-0.5'}`} />
                  </div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 group-hover:text-slate-200 transition-colors whitespace-nowrap">Stream</span>
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              {isLoading ? (
                <button
                  onClick={onStop}
                  className="flex-grow bg-red-600/10 text-red-400 border border-red-500/20 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-red-600/20 active:scale-95 transition-all font-bold text-sm tracking-tight"
                >
                  <StopIcon className="w-4 h-4" />
                  Interrupt Process
                </button>
              ) : (
                <button
                  onClick={handleRunClick}
                  disabled={!selectedFunctionId || !selectedModel}
                  className="flex-grow bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] disabled:opacity-30 disabled:grayscale transition-all active:scale-[0.98] font-bold text-sm tracking-tight"
                >
                  <PlayIcon className="w-4 h-4" />
                  Run AI
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Divider with collapse toggle */}
        <div className="relative flex items-center justify-center w-4 flex-shrink-0 z-20">
          <button
            onClick={() => setCollapsedLeft(!collapsedLeft)}
            className="absolute top-1/2 -translate-y-1/2 w-5 h-10 bg-slate-900 border border-white/10 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-all shadow-2xl opacity-60 hover:opacity-100"
          >
            <ChevronRightIcon className={`w-3.5 h-3.5 transition-transform duration-500 ${collapsedLeft ? '' : 'rotate-180'}`} />
          </button>
        </div>

        {/* Output Panel */}
        <main className="flex flex-col bg-slate-900/20 backdrop-blur-2xl rounded-3xl border border-white/5 flex-grow min-w-0 shadow-2xl overflow-hidden relative">
          {/* Output Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-blue-500 animate-pulse' : aiResponse ? 'bg-emerald-500' : 'bg-slate-700'}`} />
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Response Terminal</h3>
            </div>
            <div className="flex gap-2">
              {aiResponse && (
                <>
                  <button
                    onClick={handleCopyResponse}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-[10px] font-bold uppercase tracking-wider"
                  >
                    {copyStatus ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5 text-slate-400" />}
                    {copyStatus ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={handleSaveOutput}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 transition-all text-[10px] font-bold uppercase tracking-wider"
                  >
                    <SaveIcon className="w-3.5 h-3.5" />
                    Export .MD
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Actual Response Content */}
          <div
            ref={responsePanelRef}
            className="flex-grow overflow-y-auto p-8 custom-scrollbar relative"
          >
            {isLoading && !aiResponse ? (
              <div className="h-full flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 border-b-2 border-blue-500 rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BrainIcon className="w-8 h-8 text-blue-500/50 animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-white tracking-wide">Processing Knowledge</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Generating unique insights...</p>
                </div>
              </div>
            ) : aiResponse ? (
              <div className="animate-in fade-in duration-700">
                {/* Always show thinking block if there's thinking content (collapsed by default) */}
                {/* The showReasoning toggle only controls whether reasoning is captured during run, not display */}
                {parsedResponse.thinkingContent && (
                  parsedResponse.isThinkingInProgress ? (
                    // Thinking in progress - show live thinking with indicator
                    <div className="mb-4 border border-purple-500/30 rounded-xl overflow-hidden bg-slate-900/50">
                      <div className="px-4 py-3 flex items-center gap-2 border-b border-purple-500/20">
                        <BrainIcon className="w-4 h-4 text-purple-400 animate-pulse" />
                        <span className="text-sm font-semibold text-purple-400">Reasoning in progress...</span>
                      </div>
                      <pre className="px-4 py-3 text-xs text-slate-400 whitespace-pre-wrap font-mono leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar">
                        {parsedResponse.thinkingContent}
                      </pre>
                    </div>
                  ) : (
                    // Thinking complete - show collapsible block
                    <ThinkingBlock content={parsedResponse.thinkingContent} />
                  )
                )}

                {/* Main response content */}
                {parsedResponse.mainContent && (
                  <div className="prose prose-invert prose-slate prose-sm max-w-none 
                    prose-headings:font-black prose-headings:tracking-tight prose-headings:text-white
                    prose-p:text-slate-300 prose-p:leading-relaxed
                    prose-strong:text-blue-400 prose-strong:font-bold
                    prose-code:text-emerald-400 prose-code:bg-emerald-500/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-slate-950 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-2xl prose-pre:shadow-2xl
                    prose-li:text-slate-400
                    prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-500/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-xl
                  ">
                    <Markdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {parsedResponse.mainContent}
                    </Markdown>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                <div className="p-8 rounded-full bg-white/5 mb-6">
                  <PlayIcon className="w-12 h-12 text-slate-600" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-500 mb-1">Awaiting function</p>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-nowrap">
                    Select a function, provide context, and click Run AI to begin.
                  </p>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>

      {/* Global Component Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.3); }
        
        @keyframes slide-in-from-top-1 { from { transform: translateY(-4px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slide-in-from-top-2 { from { transform: translateY(-12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slide-in-from-bottom-2 { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        .animate-in { animation: 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .fade-in { animation-name: fade-in; }
        .slide-in-from-top-1 { animation-name: slide-in-from-top-1; }
        .slide-in-from-top-2 { animation-name: slide-in-from-top-2; }
        .slide-in-from-bottom-2 { animation-name: slide-in-from-bottom-2; }


        pre code {
          font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', monospace !important;
          font-size: 0.85rem !important;
          line-height: 1.6 !important;
        }

        .prose hr { border-color: rgba(255,255,255,0.05); margin: 2rem 0; }

        /* Premium Table Styling */
        .prose table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin: 2rem 0;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.02);
          box-shadow: 0 4px 24px -1px rgba(0, 0, 0, 0.2);
        }

        .prose thead {
          background: rgba(255, 255, 255, 0.03);
        }

        .prose th {
          color: #60a5fa !important; /* blue-400 */
          font-weight: 800 !important;
          text-transform: uppercase;
          font-size: 0.7rem !important;
          letter-spacing: 0.1em;
          padding: 1rem 1.5rem !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          text-align: left !important;
        }

        .prose td {
          padding: 1rem 1.5rem !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03) !important;
          font-size: 0.85rem !important;
          line-height: 1.6 !important;
          color: rgba(255, 255, 255, 0.8) !important;
        }

        .prose tr:last-child td {
          border-bottom: none !important;
        }

        .prose tr:hover td {
          background: rgba(255, 255, 255, 0.01);
          color: #fff !important;
          transition: all 0.2s ease;
        }
      `}</style>

      {/* System Prompt Modal Override */}
      {selectedFunction && (
        <Modal
          isOpen={showSystemPrompt}
          onClose={() => setShowSystemPrompt(false)}
          title={`Intelligence Core: ${selectedFunction.name}`}
        >
          <div className="space-y-6 p-1">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">System Architecture Reference</p>
              <div className="bg-slate-950 rounded-2xl p-6 border border-white/10 font-mono text-[11px] text-slate-300 leading-relaxed max-h-[65vh] overflow-y-auto custom-scrollbar whitespace-pre-wrap shadow-inner selection:bg-blue-500/40">
                {selectedFunction.systemPrompt}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSystemPrompt(false)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xl shadow-blue-500/20 active:scale-95 uppercase tracking-wider"
              >
                Close Core View
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};