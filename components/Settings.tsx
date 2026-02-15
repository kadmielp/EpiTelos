import React, { useRef } from 'react';
import { ISettings, IContextSource, IAIFunction, VerificationStatus } from '../types';
import { ModelSourceConfig } from './settings/ModelSourceConfig';
import { CogIcon } from './icons/CogIcon';
import { SaveIcon } from './icons/SaveIcon';
import { ExternalLinkIcon } from './icons/ExternalLinkIcon';

interface SettingsProps {
    isDesktop: boolean;
    settings: ISettings;
    updateSettings: (newSettings: Partial<ISettings>) => void;
    contexts: IContextSource[];
    functions: IAIFunction[];
    onExport: () => void;
    onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
    availableModels: string[];
    verificationStatus: VerificationStatus | null;
    verifyAndLoadModels: (source: ISettings['modelSource'], settings: ISettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({
    isDesktop,
    settings,
    updateSettings,
    contexts,
    functions,
    onExport,
    onImport,
    availableModels,
    verificationStatus,
    verifyAndLoadModels
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40 backdrop-blur-3xl shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    <div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Global Configuration</h2>
                        <h1 className="text-xl font-bold text-white tracking-tight">System Settings</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onExport}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all active:scale-95"
                    >
                        <SaveIcon className="w-3.5 h-3.5" /> Export Profile
                    </button>
                    <button
                        onClick={handleImportClick}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-400 transition-all active:scale-95"
                    >
                        <ExternalLinkIcon className="w-3.5 h-3.5" /> Import Profile
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={onImport}
                        className="hidden"
                        accept=".json"
                    />
                </div>
            </header>

            {/* Main Settings Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
                {/* Provider Configuration Section */}
                <ModelSourceConfig
                    settings={settings}
                    updateSettings={updateSettings}
                    availableModels={availableModels}
                    verificationStatus={verificationStatus}
                    verifyAndLoadModels={verifyAndLoadModels}
                />


                {/* Interface Preferences */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">Interface & Logic</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-white mb-1">Process Notifications</p>
                                <p className="text-[10px] text-slate-500 leading-relaxed max-w-[200px]">Play sound and show system alerts when AI finishes processing.</p>
                            </div>
                            <button
                                onClick={() => updateSettings({ notificationEnabled: !settings.notificationEnabled })}
                                className={`w-12 h-6 rounded-full transition-all relative ${settings.notificationEnabled ? 'bg-blue-600' : 'bg-white/10'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.notificationEnabled ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 flex flex-col justify-center">
                            <p className="text-xs font-bold text-white mb-1">Security Status</p>
                            <div className="flex items-center gap-2 mt-2">
                                <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-[0.2em] ${isDesktop ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                    {isDesktop ? 'Hardware-Backed Encryption Active' : 'Session-Only Storage'}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.3); }
      `}</style>
        </div>
    );
};
