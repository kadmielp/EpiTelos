import React, { useState, useEffect, useCallback } from 'react';
import { ISettings, IContextSource, IAIFunction, VerificationStatus } from '../types';
import { RefreshIcon } from './icons/RefreshIcon';
import { SaveIcon } from './icons/SaveIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { useRef } from 'react';

interface SettingsProps {
    isDesktop: boolean;
    settings: ISettings;
    updateSettings: (newSettings: Partial<ISettings>) => void;
    contexts: IContextSource[];
    functions: IAIFunction[];
    onExport: () => void;
    onImport: (eventOrPath: React.ChangeEvent<HTMLInputElement> | string) => void;
    availableModels: string[];
    verificationStatus: VerificationStatus | null;
    verifyAndLoadModels: (source: ISettings['modelSource'], settingsToVerify: ISettings) => void;
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

    const [localSettings, setLocalSettings] = useState<ISettings>(settings);
    const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

    const providerDropdownRef = useRef<HTMLDivElement>(null);
    const modelDropdownRef = useRef<HTMLDivElement>(null);

    // Handle click outside for custom dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (providerDropdownRef.current && !providerDropdownRef.current.contains(event.target as Node)) {
                setIsProviderDropdownOpen(false);
            }
            if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
                setIsModelDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings);

    // Sync local state if global settings change (e.g., profile import)
    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handleLocalSettingsChange = (newValues: Partial<ISettings>) => {
        setLocalSettings(prev => ({ ...prev, ...newValues }));
    };

    const handleSourceChange = (source: ISettings['modelSource']) => {
        // Look up the previously stored model for this source
        let rememberedModel = '';
        switch (source) {
            case 'Gemini': rememberedModel = localSettings.geminiModel || ''; break;
            case 'Ollama': rememberedModel = localSettings.ollamaModel || ''; break;
            case 'OpenAI': rememberedModel = localSettings.openaiModel || ''; break;
            case 'Maritaca': rememberedModel = localSettings.maritacaModel || ''; break;
            case 'Custom': rememberedModel = localSettings.customModel || ''; break;
        }

        const newSettings = {
            ...localSettings,
            modelSource: source,
            preferredModel: rememberedModel
        };
        setLocalSettings(newSettings);
        // Immediately trigger verification for the new source
        verifyAndLoadModels(source, newSettings);
    };

    const handleSave = () => {
        updateSettings(localSettings);
    };

    const handleImportClick = async () => {
        // @ts-ignore
        if (isDesktop && window.__TAURI__) {
            // @ts-ignore
            const path = await window.__TAURI__.dialog.open({
                multiple: false,
                filters: [{ name: 'JSON', extensions: ['json'] }]
            });
            if (typeof path === 'string') {
                onImport(path);
            }
        } else {
            // Trigger the hidden file input for web
            document.getElementById('import-profile-input')?.click();
        }
    };

    const renderVerificationStatus = () => {
        if (!verificationStatus) return null;
        const isSuccess = verificationStatus.type === 'success';
        const isError = verificationStatus.type === 'error';
        const isVerifying = verificationStatus.type === 'verifying';

        return (
            <div className={`mt-3 p-3 rounded-xl border animate-in fade-in slide-in-from-top-1 transition-all duration-300 text-[11px] font-medium ${isSuccess
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : isError
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                }`}>
                <div className="flex items-center gap-2.5">
                    {isSuccess && (
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                    {isError && (
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                    {isVerifying && <RefreshIcon className="w-4 h-4 animate-spin flex-shrink-0" />}
                    <span>{verificationStatus.message}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-200 selection:bg-blue-500/30 overflow-hidden relative">
            {/* Premium Gradient Backgrounds Overlay */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
            </div>

            {/* Header Area */}
            <div className="z-10 px-8 py-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                    <div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Environment configuration</h2>
                        <h1 className="text-xl font-bold text-white tracking-tight">System Settings</h1>
                    </div>
                </div>
                <div className="flex gap-2.5">
                    <button
                        onClick={onExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-[11px] font-bold uppercase tracking-wider text-slate-300"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Export
                    </button>
                    <button
                        onClick={handleImportClick}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-[11px] font-bold uppercase tracking-wider text-slate-300"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Import
                    </button>
                    {!isDesktop && (
                        <input
                            type="file"
                            id="import-profile-input"
                            accept=".json"
                            className="hidden"
                            onChange={(e) => onImport(e as React.ChangeEvent<HTMLInputElement>)}
                        />
                    )}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar z-10 p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Model Provider Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-4">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Intelligence Provider</label>
                            <div className="h-px bg-white/5 flex-grow" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Custom Intelligence Provider Dropdown */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Selection</p>
                                <div ref={providerDropdownRef} className="relative">
                                    <button
                                        onClick={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)}
                                        className="w-full bg-slate-900/60 border border-white/10 rounded-2xl p-3.5 text-sm text-white flex items-center justify-between hover:bg-slate-800/60 transition-all outline-none focus:border-blue-500/50"
                                    >
                                        <span className="font-medium">{localSettings.modelSource}</span>
                                        <ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isProviderDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isProviderDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden backdrop-blur-3xl animate-in fade-in slide-in-from-top-1">
                                            <div className="p-1.5">
                                                {['Gemini', 'Ollama', 'OpenAI', 'Maritaca', 'Custom'].map(source => (
                                                    <button
                                                        key={source}
                                                        onClick={() => { handleSourceChange(source as ISettings['modelSource']); setIsProviderDropdownOpen(false); }}
                                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition-all mb-0.5 last:mb-0 ${localSettings.modelSource === source ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                                                    >
                                                        {source}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Custom Preferred Model Dropdown */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Preferred Model</p>
                                <div ref={modelDropdownRef} className="relative">
                                    <button
                                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                        disabled={availableModels.length === 0 && verificationStatus?.type !== 'verifying'}
                                        className="w-full bg-slate-900/60 border border-white/10 rounded-2xl p-3.5 text-sm text-white flex items-center justify-between hover:bg-slate-800/60 transition-all disabled:opacity-30 disabled:cursor-not-allowed outline-none focus:border-blue-500/50"
                                    >
                                        <span className="font-medium truncate pr-4">
                                            {availableModels.length > 0
                                                ? localSettings.preferredModel
                                                : (verificationStatus?.type === 'verifying' ? 'Loading models...' : 'Verify to load models')}
                                        </span>
                                        <ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isModelDropdownOpen && availableModels.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden backdrop-blur-3xl animate-in fade-in slide-in-from-top-1">
                                            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5">
                                                {availableModels.map(model => (
                                                    <button
                                                        key={model}
                                                        onClick={() => {
                                                            const sourceField = `${localSettings.modelSource.toLowerCase()}Model` as keyof ISettings;
                                                            handleLocalSettingsChange({
                                                                preferredModel: model,
                                                                [sourceField]: model
                                                            });
                                                            setIsModelDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition-all mb-0.5 last:mb-0 ${localSettings.preferredModel === model ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                                                    >
                                                        {model}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Authentication & Connectivity Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-4">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Connectivity & AUTH</label>
                            <div className="h-px bg-white/5 flex-grow" />
                        </div>

                        <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-6 shadow-2xl">
                            {/* Gemini Settings */}
                            {localSettings.modelSource === 'Gemini' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-300 ml-1">Gemini API Key</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="password"
                                                value={localSettings.geminiApiKey || ''}
                                                onChange={e => handleLocalSettingsChange({ geminiApiKey: e.target.value })}
                                                className="flex-grow bg-slate-950/50 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-700 outline-none focus:border-blue-500/50 transition-all font-mono"
                                                placeholder="Enter your API key"
                                            />
                                            <button
                                                onClick={() => verifyAndLoadModels('Gemini', localSettings)}
                                                disabled={verificationStatus?.type === 'verifying'}
                                                className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-white/5 transition-all flex items-center gap-2 group shadow-xl"
                                                title="Verify connection"
                                            >
                                                <RefreshIcon className={`w-4 h-4 group-hover:text-blue-400 transition-colors ${verificationStatus?.type === 'verifying' ? 'animate-spin' : ''}`} />
                                                <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Verify</span>
                                            </button>
                                        </div>
                                    </div>
                                    {renderVerificationStatus()}
                                </div>
                            )}

                            {/* Ollama Settings */}
                            {localSettings.modelSource === 'Ollama' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-300 ml-1">Ollama API Base URL</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                value={localSettings.ollamaApiUrl}
                                                onChange={e => handleLocalSettingsChange({ ollamaApiUrl: e.target.value })}
                                                className="flex-grow bg-slate-950/50 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-700 outline-none focus:border-blue-500/50 transition-all"
                                                placeholder="http://localhost:11434"
                                            />
                                            <button
                                                onClick={() => verifyAndLoadModels('Ollama', localSettings)}
                                                disabled={verificationStatus?.type === 'verifying'}
                                                className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-white/5 transition-all flex items-center gap-2 group shadow-xl"
                                            >
                                                <RefreshIcon className={`w-4 h-4 group-hover:text-blue-400 transition-colors ${verificationStatus?.type === 'verifying' ? 'animate-spin' : ''}`} />
                                                <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Verify</span>
                                            </button>
                                        </div>
                                    </div>
                                    {renderVerificationStatus()}
                                </div>
                            )}

                            {/* OpenAI Settings */}
                            {localSettings.modelSource === 'OpenAI' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-300 ml-1">OpenAI API Key</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="password"
                                                value={localSettings.openaiApiKey || ''}
                                                onChange={e => handleLocalSettingsChange({ openaiApiKey: e.target.value })}
                                                className="flex-grow bg-slate-950/50 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-700 outline-none focus:border-blue-500/50 transition-all font-mono"
                                                placeholder="sk-..."
                                            />
                                            <button
                                                onClick={() => verifyAndLoadModels('OpenAI', localSettings)}
                                                disabled={verificationStatus?.type === 'verifying'}
                                                className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-white/5 transition-all flex items-center gap-2 group shadow-xl"
                                            >
                                                <RefreshIcon className={`w-4 h-4 group-hover:text-blue-400 transition-colors ${verificationStatus?.type === 'verifying' ? 'animate-spin' : ''}`} />
                                                <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Verify</span>
                                            </button>
                                        </div>
                                    </div>
                                    {renderVerificationStatus()}
                                </div>
                            )}

                            {/* Maritaca Settings */}
                            {localSettings.modelSource === 'Maritaca' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-300 ml-1">Maritaca API Key</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="password"
                                                value={localSettings.maritacaApiKey || ''}
                                                onChange={e => handleLocalSettingsChange({ maritacaApiKey: e.target.value })}
                                                className="flex-grow bg-slate-950/50 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-700 outline-none focus:border-blue-500/50 transition-all font-mono"
                                                placeholder="Enter your API key"
                                            />
                                            <button
                                                onClick={() => verifyAndLoadModels('Maritaca', localSettings)}
                                                disabled={verificationStatus?.type === 'verifying'}
                                                className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-white/5 transition-all flex items-center gap-2 group shadow-xl"
                                                title="Verify connection"
                                            >
                                                <RefreshIcon className={`w-4 h-4 group-hover:text-blue-400 transition-colors ${verificationStatus?.type === 'verifying' ? 'animate-spin' : ''}`} />
                                                <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Verify</span>
                                            </button>
                                        </div>
                                    </div>
                                    {renderVerificationStatus()}
                                </div>
                            )}

                            {/* Custom Provider Settings */}
                            {localSettings.modelSource === 'Custom' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-300 ml-1">Base URL</label>
                                            <input
                                                type="text"
                                                value={localSettings.customApiUrl || ''}
                                                onChange={e => handleLocalSettingsChange({ customApiUrl: e.target.value })}
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-700 outline-none focus:border-blue-500/50 transition-all"
                                                placeholder="https://api.example.com"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-slate-300 ml-1">API Key</label>
                                            <div className="flex gap-3">
                                                <input
                                                    type="password"
                                                    value={localSettings.customApiKey || ''}
                                                    onChange={e => handleLocalSettingsChange({ customApiKey: e.target.value })}
                                                    className="flex-grow bg-slate-950/50 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-700 outline-none focus:border-blue-500/50 transition-all font-mono"
                                                    placeholder="Enter API Key"
                                                />
                                                <button
                                                    onClick={() => verifyAndLoadModels('Custom', localSettings)}
                                                    disabled={verificationStatus?.type === 'verifying'}
                                                    className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-white/5 transition-all flex items-center gap-2 group shadow-xl"
                                                >
                                                    <RefreshIcon className={`w-4 h-4 group-hover:text-blue-400 transition-colors ${verificationStatus?.type === 'verifying' ? 'animate-spin' : ''}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    {renderVerificationStatus()}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {/* Action Footer */}
            <div className="z-10 p-6 border-t border-white/[0.08] bg-slate-950/80 backdrop-blur-3xl flex items-center justify-center">
                <div className="max-w-4xl w-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {hasChanges ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Unsaved Changes</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Settings Synced</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={!hasChanges}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black py-3 px-8 rounded-2xl flex items-center gap-3 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] disabled:opacity-30 disabled:grayscale transition-all active:scale-[0.98] text-xs uppercase tracking-widest"
                    >
                        <SaveIcon className="w-4 h-4" />
                        Commit Changes
                    </button>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.3); }

                @keyframes slide-in-from-top-1 { from { transform: translateY(-4px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes slide-in-from-top-2 { from { transform: translateY(-12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                
                .animate-in { animation: 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .fade-in { animation-name: fade-in; }
                .slide-in-from-top-1 { animation-name: slide-in-from-top-1; }
                .slide-in-from-top-2 { animation-name: slide-in-from-top-2; }
            `}</style>
        </div>
    );
};
