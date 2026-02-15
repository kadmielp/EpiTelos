import React, { useMemo, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SaveIcon } from '../icons/SaveIcon';
import { CopyIcon } from '../icons/CopyIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { BrainIcon } from '../icons/BrainIcon';
import { ThinkingBlock } from '../ThinkingBlock';
import { MermaidDiagramSizeWrapper } from '../MermaidDiagram';

interface ResponseTerminalProps {
    aiResponse: string;
    isLoading: boolean;
    isStreaming: boolean;
    onCopy: () => void;
    onExport: () => void;
    copyStatus: boolean;
}

export const ResponseTerminal: React.FC<ResponseTerminalProps> = ({
    aiResponse,
    isLoading,
    isStreaming,
    onCopy,
    onExport,
    copyStatus
}) => {
    const responsePanelRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logic
    useEffect(() => {
        if (isLoading && isStreaming && responsePanelRef.current) {
            const el = responsePanelRef.current;
            el.scrollTop = el.scrollHeight;
        }
    }, [aiResponse, isLoading, isStreaming]);

    const parsedResponse = useMemo(() => {
        if (!aiResponse) return { thinkingContent: null, mainContent: '' };
        const thinkMatch = aiResponse.match(/<think>([\s\S]*?)<\/think>/);
        if (thinkMatch) {
            const thinkingContent = thinkMatch[1].trim();
            const mainContent = aiResponse.replace(/<think>[\s\S]*?<\/think>\s*/, '').trim();
            return { thinkingContent, mainContent };
        }
        if (aiResponse.includes('<think>') && !aiResponse.includes('</think>')) {
            const thinkingContent = aiResponse.replace('<think>', '').trim();
            return { thinkingContent, mainContent: '', isThinkingInProgress: true };
        }
        return { thinkingContent: null, mainContent: aiResponse };
    }, [aiResponse]);

    const markdownComponents = useMemo(() => ({
        code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const content = String(children).replace(/\n$/, '');
            if (!inline && language === 'mermaid') {
                return <MermaidDiagramSizeWrapper content={content} />;
            }
            return (
                <code className={className} {...props}>
                    {children}
                </code>
            );
        }
    }), []);

    return (
        <>
            <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-blue-500 animate-pulse' : aiResponse ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Response Terminal</h3>
                </div>
                <div className="flex gap-2">
                    {aiResponse && (
                        <>
                            <button onClick={onCopy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-[10px] font-bold uppercase tracking-wider">
                                {copyStatus ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5 text-slate-400" />}
                                {copyStatus ? 'Copied' : 'Copy'}
                            </button>
                            <button onClick={onExport} disabled={isLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 transition-all text-[10px] font-bold uppercase tracking-wider">
                                <SaveIcon className="w-3.5 h-3.5" /> Export .MD
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div ref={responsePanelRef} className="flex-grow overflow-y-auto p-8 custom-scrollbar relative">
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
                    <div className="animate-fade-in duration-700">
                        {parsedResponse.thinkingContent && (
                            parsedResponse.isThinkingInProgress ? (
                                <div className="mb-4 border border-purple-500/30 rounded-xl overflow-hidden bg-slate-900/50">
                                    <div className="px-4 py-3 flex items-center gap-2 border-b border-purple-500/20">
                                        <BrainIcon className="w-4 h-4 text-purple-400 animate-pulse" />
                                        <span className="text-sm font-semibold text-purple-400">Reasoning...</span>
                                    </div>
                                    <pre className="px-4 py-3 text-xs text-slate-400 whitespace-pre-wrap font-mono leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar">
                                        {parsedResponse.thinkingContent}
                                    </pre>
                                </div>
                            ) : (
                                <ThinkingBlock content={parsedResponse.thinkingContent} />
                            )
                        )}

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
                                <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                    {parsedResponse.mainContent}
                                </Markdown>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-40">
                        <div className="p-8 rounded-full bg-white/5 mb-6"><PlayIcon className="w-12 h-12 text-slate-600" /></div>
                        <div className="text-center">
                            <p className="text-lg font-bold text-slate-500 mb-1">Awaiting function</p>
                            <p className="text-xs text-slate-600 leading-relaxed whitespace-nowrap">Select a function and context to begin.</p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
