import React, { useState } from 'react';
import { BrainIcon } from './icons/BrainIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface ThinkingBlockProps {
    content: string;
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = React.memo(({ content }) => {
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
            <div
                className={`grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
                <div className="overflow-hidden border-t border-slate-700/30">
                    <div className="px-4 pb-4">
                        <pre className="text-xs text-slate-500 whitespace-pre-wrap font-mono leading-relaxed mt-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {content}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
});
