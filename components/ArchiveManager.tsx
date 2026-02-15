import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { IArchive, IAIFunction } from '../types';
import { ClockIcon } from './icons/ClockIcon';
import { TrashIcon } from './icons/TrashIcon';
import { RotateCcwIcon } from './icons/RotateCcwIcon';
import { SearchIcon } from './icons/SearchIcon';
import { MLIcon } from './icons/MLIcon';
import { ThinkingBlock } from './ThinkingBlock';
import { ResponseTerminal } from './runner/ResponseTerminal';
import { CopyIcon } from './icons/CopyIcon';
import { FolderIcon } from './icons/FolderIcon';

// Relative time helper
const getRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return new Date(timestamp).toLocaleDateString();
};

const getContextDisplayName = (id: string) => {
    if (!id.startsWith('ctx-')) return id;

    // Remove 'ctx-' prefix
    let encoded = id.slice(4);

    // IDs from addContext have a timestamp suffix: -1739628000000 (13 digits)
    // IDs from expandFolderSource do NOT have a timestamp
    // We detect and strip the timestamp if present
    const timestampMatch = encoded.match(/-(\d{13})$/);
    if (timestampMatch) {
        encoded = encoded.slice(0, -14); // Remove -<13 digits>
    }

    // The encoded string is the original file path with all non-alphanumeric chars replaced by '-'
    // Original: C:\Users\Orion\...\2026-01-01 (1 of 365).md
    // Encoded:  C--Users-Orion-...-2026-01-01--1-of-365--md
    //
    // We can't perfectly reverse this, but we know that:
    // - Path separators (\, /) become -- (double dash) 
    // - Dots become - (single dash)
    // - Spaces become - (single dash)
    // - Parens become - (single dash)
    //
    // Strategy: split by '--' to get path segments, take the last one
    // which is the filename part, then show it as-is with dashes
    const pathSegments = encoded.split('--');
    const filenamePart = pathSegments[pathSegments.length - 1];

    // Try to restore the dot before extension
    // Match: "something-ext" where ext is a known file extension at the end
    const extRegex = /^(.+)-([a-zA-Z]{1,4})$/;
    const extMatch = filenamePart.match(extRegex);
    const knownExts = ['md', 'txt', 'js', 'json', 'ts', 'tsx', 'py', 'pdf', 'csv', 'html', 'css', 'rs', 'go'];

    if (extMatch && knownExts.includes(extMatch[2].toLowerCase())) {
        const name = extMatch[1].replace(/-/g, ' ').trim();
        return `${name}.${extMatch[2]}`;
    }

    // Fallback: just replace dashes with spaces
    return filenamePart.replace(/-/g, ' ').trim() || id;
};

// Date group helper
const getDateGroup = (timestamp: number): string => {
    const now = new Date();
    const date = new Date(timestamp);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const thisWeek = new Date(today.getTime() - 7 * 86400000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (date >= today) return 'Today';
    if (date >= yesterday) return 'Yesterday';
    if (date >= thisWeek) return 'This Week';
    if (date >= thisMonth) return 'This Month';
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

interface ArchiveManagerProps {
    archives: IArchive[];
    onDelete: (id: string) => void;
    onRestore: (archive: IArchive) => void;
    onInspectContext: (contextId: string) => void;
    functions: IAIFunction[];
}

export const ArchiveManager: React.FC<ArchiveManagerProps> = ({ archives, onDelete, onRestore, onInspectContext, functions }) => {
    const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(archives[0]?.id || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState(false);
    const [responseCopyStatus, setResponseCopyStatus] = useState(false);

    const filteredArchives = useMemo(() => {
        return archives.filter(a =>
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.userInput.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.assistantResponse.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [archives, searchQuery]);

    const groupedArchives = useMemo(() => {
        const groups: { label: string; archives: IArchive[] }[] = [];
        const groupMap = new Map<string, IArchive[]>();
        for (const arch of filteredArchives) {
            const group = getDateGroup(arch.timestamp);
            if (!groupMap.has(group)) groupMap.set(group, []);
            groupMap.get(group)!.push(arch);
        }
        for (const [label, items] of groupMap) {
            groups.push({ label, archives: items });
        }
        return groups;
    }, [filteredArchives]);

    const selectedArchive = useMemo(() =>
        archives.find(a => a.id === selectedArchiveId) || null
        , [archives, selectedArchiveId]);

    const getFunctionName = (id: string) => {
        return functions.find(f => f.id === id)?.name || 'Unknown Function';
    };

    const handleConfirmDelete = useCallback(() => {
        if (pendingDeleteId) {
            const idx = filteredArchives.findIndex(a => a.id === pendingDeleteId);
            onDelete(pendingDeleteId);
            setPendingDeleteId(null);
            if (selectedArchiveId === pendingDeleteId) {
                const next = filteredArchives[idx + 1] || filteredArchives[idx - 1];
                setSelectedArchiveId(next?.id || null);
            }
        }
    }, [pendingDeleteId, onDelete, selectedArchiveId, filteredArchives]);

    // Keyboard shortcuts: ↑/↓ navigate, Delete prompts confirmation, Enter restores, Escape cancels
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const currentIdx = filteredArchives.findIndex(a => a.id === selectedArchiveId);
                const nextIdx = e.key === 'ArrowDown'
                    ? (currentIdx < filteredArchives.length - 1 ? currentIdx + 1 : 0)
                    : (currentIdx > 0 ? currentIdx - 1 : filteredArchives.length - 1);
                setSelectedArchiveId(filteredArchives[nextIdx]?.id || null);
            } else if (e.key === 'Delete' && selectedArchiveId && !pendingDeleteId) {
                e.preventDefault();
                setPendingDeleteId(selectedArchiveId);
            } else if (e.key === 'Enter' && selectedArchive && !pendingDeleteId) {
                e.preventDefault();
                onRestore(selectedArchive);
            } else if (e.key === 'Escape' && pendingDeleteId) {
                e.preventDefault();
                setPendingDeleteId(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredArchives, selectedArchiveId, selectedArchive, pendingDeleteId, onRestore]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header Area */}
            <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40 backdrop-blur-3xl shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                    <div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Intelligence Archives</h2>
                        <h1 className="text-xl font-bold text-white tracking-tight">System History</h1>
                    </div>
                </div>

                <div className="relative w-72">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                        <SearchIcon className="w-4 h-4" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search past logs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-600 focus:border-blue-500/50 outline-none transition-all"
                    />
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* List Sidebar */}
                <div className="w-80 border-r border-white/5 flex flex-col bg-slate-950/20 relative">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                        {filteredArchives.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                                <ClockIcon className="w-12 h-12 mb-4 opacity-10" />
                                <p className="text-[10px] uppercase font-black tracking-widest leading-relaxed">No archives found matching your criteria.</p>
                            </div>
                        ) : (
                            groupedArchives.map(group => (
                                <div key={group.label} className="mb-2">
                                    <div className="flex items-center gap-3 px-1 py-3 sticky top-0 bg-slate-950/90 backdrop-blur-sm z-10">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">{group.label}</span>
                                        <div className="flex-1 h-px bg-white/[0.06]" />
                                    </div>
                                    <div className="space-y-1.5 pt-1.5">
                                        {group.archives.map(arch => (
                                            <button
                                                key={arch.id}
                                                onClick={() => setSelectedArchiveId(arch.id)}
                                                className={`w-full text-left p-4 rounded-2xl border transition-all relative group ${selectedArchiveId === arch.id
                                                    ? 'bg-blue-600/10 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]'
                                                    : 'bg-white/5 border-transparent hover:border-white/10 hover:bg-white/[0.07]'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{getRelativeTime(arch.timestamp)}</span>
                                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${selectedArchiveId === arch.id ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-500'
                                                        }`}>{arch.model.split('/').pop()}</span>
                                                </div>
                                                <h4 className={`text-xs font-bold truncate mb-1 ${selectedArchiveId === arch.id ? 'text-white' : 'text-slate-300'}`}>{arch.title}</h4>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight truncate">{getFunctionName(arch.functionId)}</p>
                                                    {arch.contextIds.length > 0 && (
                                                        <>
                                                            <div className="w-1 h-1 rounded-full bg-slate-800" />
                                                            <div className="flex items-center gap-1 text-slate-600">
                                                                <FolderIcon className="w-2.5 h-2.5" />
                                                                <span className="text-[9px] font-bold">{arch.contextIds.length}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {selectedArchiveId === arch.id && (
                                                    <div className="absolute right-4 bottom-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setPendingDeleteId(arch.id); }}
                                                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all shadow-xl backdrop-blur-md"
                                                            title="Delete entry (Del)"
                                                        >
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Delete Confirmation Toast */}
                    {pendingDeleteId && (
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-xl border-t border-red-500/20 z-20" style={{ animation: 'slideUp 0.2s ease-out' }}>
                            <p className="text-xs text-slate-300 font-bold mb-3">Delete this archive permanently?</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleConfirmDelete}
                                    className="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl border border-red-500/30 text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    Delete
                                </button>
                                <button
                                    onClick={() => setPendingDeleteId(null)}
                                    className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    Cancel (Esc)
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Preview Main Area */}
                <div className="flex-1 overflow-hidden bg-slate-900/10 relative flex flex-col">
                    {selectedArchive ? (
                        <>
                            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0">
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-white tracking-tight">{selectedArchive.title}</h3>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{getFunctionName(selectedArchive.functionId)}</span>
                                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{selectedArchive.model}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => onRestore(selectedArchive)}
                                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all active:scale-[0.98] text-[10px] font-black uppercase tracking-widest"
                                >
                                    <RotateCcwIcon className="w-4 h-4" /> Restore to Laboratory
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                                {/* User Input Section */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-400">
                                        <div className="w-1 h-3 bg-blue-500 rounded-full" /> User Prompt
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedArchive.userInput);
                                            setCopyStatus(true);
                                            setTimeout(() => setCopyStatus(false), 2000);
                                        }}
                                        className="text-[9px] font-bold text-slate-600 hover:text-blue-400 flex items-center gap-1.5 transition-colors uppercase tracking-widest"
                                    >
                                        <CopyIcon className="w-3 h-3" /> {copyStatus ? 'Copied!' : 'Copy Prompt'}
                                    </button>
                                </div>
                                <div className="bg-slate-950/40 border border-white/5 rounded-3xl p-6 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-blue-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    {selectedArchive.userInput}
                                </div>

                                {selectedArchive.contextIds.length > 0 && (
                                    <div className="pt-2 space-y-3">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            <div className="w-1 h-3 bg-slate-700 rounded-full" /> Knowledge Sources ({selectedArchive.contextIds.length})
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedArchive.contextIds.map((cid, index) => {
                                                const cleanName = selectedArchive.contextNames ? selectedArchive.contextNames[index] : getContextDisplayName(cid);
                                                return (
                                                    <button
                                                        key={cid}
                                                        title={`Click to inspect: ${cleanName}`}
                                                        onClick={() => onInspectContext(cid)}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/10 rounded-lg text-[10px] text-slate-300 font-bold group hover:bg-blue-500/10 hover:border-blue-500/30 transition-all cursor-pointer"
                                                    >
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-blue-500 transition-colors" />
                                                        <span className="truncate max-w-[400px]">{cleanName}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Assistant Response Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-400">
                                        <div className="w-1 h-3 bg-purple-500 rounded-full" /> Intelligence Output
                                    </div>
                                    <div className="space-y-4">
                                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 shadow-2xl overflow-hidden relative">
                                            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600/20" />
                                            <ResponseTerminal
                                                aiResponse={selectedArchive.reasoningBlock
                                                    ? `<think>${selectedArchive.reasoningBlock}</think>\n\n${selectedArchive.assistantResponse}`
                                                    : selectedArchive.assistantResponse
                                                }
                                                isLoading={false}
                                                isStreaming={false}
                                                onCopy={() => {
                                                    navigator.clipboard.writeText(selectedArchive.assistantResponse);
                                                    setResponseCopyStatus(true);
                                                    setTimeout(() => setResponseCopyStatus(false), 2000);
                                                }}
                                                onExport={async () => {
                                                    if (!selectedArchive) return;
                                                    const timestamp = new Date(selectedArchive.timestamp).toISOString().replace(/[:.]/g, '-');
                                                    const filename = `${selectedArchive.title.replace(/[^a-zA-Z0-9 ]/g, '')}_${timestamp}.md`;
                                                    const content = `# ${selectedArchive.title}\n\n**Function:** ${getFunctionName(selectedArchive.functionId)}  \n**Model:** ${selectedArchive.model}  \n**Date:** ${new Date(selectedArchive.timestamp).toLocaleString()}\n\n---\n\n## User Prompt\n\n${selectedArchive.userInput}\n\n---\n\n## Response\n\n${selectedArchive.assistantResponse}`;
                                                    // @ts-ignore
                                                    if (window.__TAURI__) {
                                                        try {
                                                            // @ts-ignore
                                                            const filePath = await window.__TAURI__.dialog.save({ defaultPath: filename, filters: [{ name: 'Markdown', extensions: ['md', 'txt'] }] });
                                                            // @ts-ignore
                                                            if (filePath) await window.__TAURI__.fs.writeTextFile(filePath, content);
                                                        } catch (e) { console.error('Export failed:', e); }
                                                    } else {
                                                        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
                                                        const url = URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url; a.download = filename;
                                                        document.body.appendChild(a); a.click();
                                                        document.body.removeChild(a); URL.revokeObjectURL(url);
                                                    }
                                                }}
                                                copyStatus={responseCopyStatus}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                            <MLIcon className="w-24 h-24 mb-6 opacity-5 animate-pulse" />
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Selection Required</h3>
                            <p className="text-[11px] text-slate-600 mt-2 max-w-[250px] leading-relaxed">Choose an intelligence archive from the list to preview the neural connection snapshot.</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.3); }
            @keyframes slideUp {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `}</style>
        </div>
    );
};
