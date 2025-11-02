import React, { useState, useEffect, useCallback } from 'react';
import { ISettings, IContextSource, IAIFunction, VerificationStatus } from '../types';
import { RefreshIcon } from './icons/RefreshIcon';
import { SaveIcon } from './icons/SaveIcon';

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

    const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings);

    // Sync local state if global settings change (e.g., profile import)
    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handleLocalSettingsChange = (newValues: Partial<ISettings>) => {
        setLocalSettings(prev => ({ ...prev, ...newValues }));
    };

    const handleSourceChange = (source: ISettings['modelSource']) => {
        const newSettings = { ...localSettings, modelSource: source, preferredModel: '' };
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
            <div className={`mt-2 p-2.5 rounded-lg border transition-all duration-300 text-xs ${
                isSuccess 
                    ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                    : isError 
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-slate-700/30 border-slate-600/30 text-slate-400'
            }`}>
                <div className="flex items-center gap-2">
                    {isSuccess && (
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    )}
                    {isError && (
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    )}
                    {isVerifying && <RefreshIcon className="w-4 h-4 animate-spin flex-shrink-0" />}
                    <span className="font-medium">{verificationStatus.message}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Modern Header with Gradient */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-1.5">
                    Settings
                </h2>
                <div className="h-0.5 w-24 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"></div>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar">
                {/* Single Unified Section */}
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-6 rounded-xl border border-slate-700/50 shadow-2xl space-y-6">
                    
                    {/* Model Source Selector */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-200 mb-2 uppercase tracking-wide">
                            Model Source
                        </label>
                        <select
                            value={localSettings.modelSource}
                            onChange={e => handleSourceChange(e.target.value as ISettings['modelSource'])}
                            className="w-full max-w-md bg-slate-800/80 border border-slate-600/50 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-slate-800 cursor-pointer shadow-lg"
                        >
                            <option>Gemini</option>
                            <option>Ollama</option>
                            <option>OpenAI</option>
                            <option>Custom</option>
                        </select>
                    </div>
                    
                    {/* Gemini Settings */}
                    {localSettings.modelSource === 'Gemini' && (
                        <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-700/30 space-y-3">
                            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wide">
                                Gemini API Key
                            </label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="password" 
                                    value={localSettings.geminiApiKey || ''} 
                                    onChange={e => handleLocalSettingsChange({ geminiApiKey: e.target.value })} 
                                    className="flex-grow bg-slate-800/80 border border-slate-600/50 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-slate-800 placeholder:text-slate-500" 
                                    placeholder="AIzaSy..." 
                                />
                                <button 
                                    onClick={() => verifyAndLoadModels('Gemini', localSettings)} 
                                    disabled={verificationStatus?.type === 'verifying'} 
                                    className="p-2.5 bg-slate-700/60 hover:bg-slate-600/60 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/50 hover:border-slate-500/50 shadow-lg hover:scale-105 active:scale-95"
                                    title="Verify connection"
                                >
                                    <RefreshIcon className={`w-5 h-5 text-slate-300 ${verificationStatus?.type === 'verifying' ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            {renderVerificationStatus()}
                        </div>
                    )}

                    {/* Ollama Settings */}
                    {localSettings.modelSource === 'Ollama' && (
                       <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-700/30 space-y-3">
                            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wide">
                                Ollama API Base URL
                            </label>
                            <div className="flex items-center gap-2">
                                 <input 
                                    type="text" 
                                    value={localSettings.ollamaApiUrl} 
                                    onChange={e => handleLocalSettingsChange({ ollamaApiUrl: e.target.value })} 
                                    className="flex-grow bg-slate-800/80 border border-slate-600/50 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-slate-800 placeholder:text-slate-500" 
                                    placeholder="http://localhost:11434" 
                                />
                                 <button 
                                    onClick={() => verifyAndLoadModels('Ollama', localSettings)} 
                                    disabled={verificationStatus?.type === 'verifying'} 
                                    className="p-2.5 bg-slate-700/60 hover:bg-slate-600/60 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/50 hover:border-slate-500/50 shadow-lg hover:scale-105 active:scale-95"
                                    title="Verify connection"
                                >
                                    <RefreshIcon className={`w-5 h-5 text-slate-300 ${verificationStatus?.type === 'verifying' ? 'animate-spin' : ''}`} />
                                 </button>
                            </div>
                            {renderVerificationStatus()}
                       </div>
                    )}
                    
                    {/* OpenAI Settings */}
                    {localSettings.modelSource === 'OpenAI' && (
                        <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-700/30 space-y-3">
                            <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wide">
                                OpenAI API Key
                            </label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="password" 
                                    value={localSettings.openaiApiKey || ''} 
                                    onChange={e => handleLocalSettingsChange({ openaiApiKey: e.target.value })} 
                                    className="flex-grow bg-slate-800/80 border border-slate-600/50 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-slate-800 placeholder:text-slate-500" 
                                    placeholder="sk-..." 
                                />
                                <button 
                                    onClick={() => verifyAndLoadModels('OpenAI', localSettings)} 
                                    disabled={verificationStatus?.type === 'verifying'} 
                                    className="p-2.5 bg-slate-700/60 hover:bg-slate-600/60 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/50 hover:border-slate-500/50 shadow-lg hover:scale-105 active:scale-95"
                                    title="Verify connection"
                                >
                                    <RefreshIcon className={`w-5 h-5 text-slate-300 ${verificationStatus?.type === 'verifying' ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            {renderVerificationStatus()}
                        </div>
                    )}
                    
                    {/* Custom Provider Settings */}
                    {localSettings.modelSource === 'Custom' && (
                        <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-700/30 space-y-3">
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wide">
                                    Base URL
                                </label>
                                <input 
                                    type="text" 
                                    value={localSettings.customApiUrl || ''} 
                                    onChange={e => handleLocalSettingsChange({ customApiUrl: e.target.value })} 
                                    className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-slate-800 placeholder:text-slate-500" 
                                    placeholder="https://api.example.com" 
                                />
                                <p className="text-xs text-slate-500">OpenAI-compatible API base URL (without '/v1')</p>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wide">
                                    API Key
                                </label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="password" 
                                        value={localSettings.customApiKey || ''} 
                                        onChange={e => handleLocalSettingsChange({ customApiKey: e.target.value })} 
                                        className="flex-grow bg-slate-800/80 border border-slate-600/50 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-slate-800 placeholder:text-slate-500" 
                                        placeholder="Enter API Key" 
                                    />
                                    <button 
                                        onClick={() => verifyAndLoadModels('Custom', localSettings)} 
                                        disabled={verificationStatus?.type === 'verifying'} 
                                        className="p-2.5 bg-slate-700/60 hover:bg-slate-600/60 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/50 hover:border-slate-500/50 shadow-lg hover:scale-105 active:scale-95"
                                        title="Verify connection"
                                    >
                                        <RefreshIcon className={`w-5 h-5 text-slate-300 ${verificationStatus?.type === 'verifying' ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                                {renderVerificationStatus()}
                            </div>
                        </div>
                    )}

                    {/* Preferred Model Dropdown */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-200 mb-2 uppercase tracking-wide">
                            Preferred Model
                        </label>
                        <select
                            value={localSettings.preferredModel}
                            onChange={e => handleLocalSettingsChange({ preferredModel: e.target.value })}
                            disabled={availableModels.length === 0 && verificationStatus?.type !== 'verifying'}
                            className="w-full max-w-md bg-slate-800/80 border border-slate-600/50 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-slate-800 disabled:bg-slate-900/50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-lg"
                        >
                            {availableModels.length > 0 ? (
                                availableModels.map(model => <option key={model} value={model}>{model}</option>)
                            ) : (
                                <option>{verificationStatus?.type === 'verifying' ? 'Loading models...' : 'Verify connection to load models'}</option>
                            )}
                        </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-slate-700/50 flex flex-wrap gap-3">
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-2.5 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 flex items-center gap-2"
                        >
                            <SaveIcon className="w-4 h-4" />
                            Save Settings
                        </button>
                        
                        <button 
                            onClick={onExport} 
                            className="bg-slate-700/60 hover:bg-slate-600/60 text-white font-semibold py-2.5 px-6 rounded-lg transition-all duration-300 border border-slate-600/50 hover:border-slate-500/50 shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Export
                        </button>
                        
                        <button 
                            onClick={handleImportClick} 
                            className="bg-slate-700/60 hover:bg-slate-600/60 text-white font-semibold py-2.5 px-6 rounded-lg transition-all duration-300 border border-slate-600/50 hover:border-slate-500/50 shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
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
                        
                        {hasChanges && (
                            <span className="text-xs text-blue-400 self-center ml-2">Unsaved changes</span>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15,23,42,0.3); border-radius:10px }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(to bottom, rgb(71,85,105), rgb(51,65,85)); border-radius:10px }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: linear-gradient(to bottom, rgb(59,130,246), rgb(147,51,234)); }
            `}</style>
        </div>
    );
};