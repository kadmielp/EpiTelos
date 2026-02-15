import React, { useState, useRef, useEffect } from 'react';
import { IAIFunction, IContextSource, TreeNode } from '../../types';
import { ExternalLinkIcon } from '../icons/ExternalLinkIcon';
import { ContextTreeView, getDescendantSourceIds } from '../ContextTreeView';
import { StopIcon } from '../icons/StopIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { PlayIcon } from '../icons/PlayIcon';

interface ControlHubProps {
    functions: IAIFunction[];
    contexts: IContextSource[];
    selectedFunctionId: string | null;
    setSelectedFunctionId: (id: string | null) => void;
    selectedContextIds: string[];
    setSelectedContextIds: (ids: string[]) => void;
    userInput: string;
    setUserInput: (input: string) => void;
    isLoading: boolean;
    onRun: () => void;
    onStop: () => void;
    isStreaming: boolean;
    setIsStreaming: (s: boolean) => void;
    showReasoning: boolean;
    setShowReasoning: (s: boolean) => void;
    selectedModel: string | null;
    onSelectModel: (m: string) => void;
    availableModels: string[];
    setShowSystemPrompt: (s: boolean) => void;
    handleViewContext: (id: string) => void;
}

export const ControlHub: React.FC<ControlHubProps> = ({
    functions,
    contexts,
    selectedFunctionId,
    setSelectedFunctionId,
    selectedContextIds,
    setSelectedContextIds,
    userInput,
    setUserInput,
    isLoading,
    onRun,
    onStop,
    isStreaming,
    setIsStreaming,
    showReasoning,
    setShowReasoning,
    selectedModel,
    onSelectModel,
    availableModels,
    setShowSystemPrompt,
    handleViewContext
}) => {
    const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
    const [isFunctionDropdownOpen, setIsFunctionDropdownOpen] = useState(false);
    const [functionSearchQuery, setFunctionSearchQuery] = useState('');

    const modelSelectorRef = useRef<HTMLDivElement>(null);
    const functionDropdownRef = useRef<HTMLDivElement>(null);

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

    const selectedFunction = functions.find(f => f.id === selectedFunctionId);
    const filteredFunctions = functions.filter(f =>
        f.name.toLowerCase().includes(functionSearchQuery.toLowerCase()) ||
        (f.category && f.category.toLowerCase().includes(functionSearchQuery.toLowerCase())) ||
        (f.description && f.description.toLowerCase().includes(functionSearchQuery.toLowerCase()))
    );

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

    return (
        <>
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Control Hub</h2>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar p-5 space-y-3">
                <section className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Active Function</label>
                    <div ref={functionDropdownRef} className="relative">
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
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Search intelligence..."
                                        value={functionSearchQuery}
                                        onChange={(e) => setFunctionSearchQuery(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                                    />
                                </div>
                                <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-4">
                                    {Object.entries(
                                        filteredFunctions.reduce((acc, f) => {
                                            const cat = f.category || (f.isCustom ? 'Custom Intelligence' : 'General');
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
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <section className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Knowledge Sources</label>
                    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-2 max-h-[280px] overflow-y-auto custom-scrollbar">
                        {contexts.length > 0 ? (
                            <ContextTreeView
                                contexts={contexts}
                                renderNode={(node) => {
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
                            </div>
                        )}
                    </div>
                </section>

                <section className="space-y-2">
                    <label htmlFor="user-input" className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Custom Instructions</label>
                    <textarea
                        id="user-input"
                        rows={1}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Add more context to the AI..."
                        className="w-full bg-slate-900/60 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-700 outline-none focus:border-blue-500/50 transition-all resize-none custom-scrollbar"
                    />
                </section>
            </div>

            <div className="p-3 border-t border-white/[0.08] space-y-2.5">
                <div className="flex items-center justify-center">
                    <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 px-2.5 rounded-xl border border-white/5 backdrop-blur-2xl shadow-lg">
                        {availableModels.length > 0 && (
                            <div ref={modelSelectorRef} className="relative flex items-center">
                                <button onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)} className="text-[10px] bg-slate-800/50 hover:bg-slate-700/50 px-2.5 py-1.5 rounded-lg border border-white/5 transition-all flex items-center gap-2 group/btn">
                                    <span className="text-slate-500 font-bold tracking-widest text-[9px]">MODEL</span>
                                    <span className="text-blue-400 font-black truncate max-w-[100px]">{selectedModel || 'NONE'}</span>
                                    <ChevronDownIcon className={`w-3.5 h-3.5 text-slate-500 group-hover/btn:text-blue-400 transition-transform duration-300 ${isModelSelectorOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isModelSelectorOpen && (
                                    <div className="absolute left-0 bottom-full mb-2 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-[0_-20px_50px_rgba(0,0,0,0.7)] z-[60] overflow-hidden backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-2">
                                        <div className="p-1 px-4 text-[9px] font-black text-slate-500 uppercase py-2 border-b border-white/5 tracking-[0.2em] bg-white/[0.02]">Select Model</div>
                                        <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5">
                                            {availableModels.map(m => (
                                                <button key={m} onClick={() => { onSelectModel(m); setIsModelSelectorOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all mb-0.5 last:mb-0 ${selectedModel === m ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}>
                                                    {m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="w-px h-4 bg-white/10" />
                        <button onClick={() => setShowReasoning(!showReasoning)} className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-white/5 transition-colors group">
                            <div className={`w-7 h-3.5 rounded-full transition-all duration-300 relative ${showReasoning ? 'bg-blue-600' : 'bg-white/10'} border border-white/5`}>
                                <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all duration-300 shadow-md ${showReasoning ? 'left-[14px]' : 'left-0.5'}`} />
                            </div>
                            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 group-hover:text-slate-200 transition-colors whitespace-nowrap">Show Reasoning</span>
                        </button>
                        <div className="w-px h-3 bg-white/10" />
                        <button onClick={() => setIsStreaming(!isStreaming)} className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-white/5 transition-colors group">
                            <div className={`w-7 h-3.5 rounded-full transition-all duration-300 relative ${isStreaming ? 'bg-purple-600' : 'bg-white/10'} border border-white/5`}>
                                <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all duration-300 shadow-md ${isStreaming ? 'left-[14px]' : 'left-0.5'}`} />
                            </div>
                            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 group-hover:text-slate-200 transition-colors whitespace-nowrap">Stream</span>
                        </button>
                    </div>
                </div>

                <div className="flex gap-2">
                    {isLoading ? (
                        <button onClick={onStop} className="flex-grow bg-red-600/10 text-red-400 border border-red-500/20 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-red-600/20 active:scale-95 transition-all font-bold text-sm tracking-tight">
                            <StopIcon className="w-4 h-4" /> Interrupt
                        </button>
                    ) : (
                        <button onClick={onRun} disabled={!selectedFunctionId || !selectedModel} className="flex-grow bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] disabled:opacity-30 disabled:grayscale transition-all active:scale-[0.98] font-bold text-sm tracking-tight">
                            <PlayIcon className="w-4 h-4" /> Run AI
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};
