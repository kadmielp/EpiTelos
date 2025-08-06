
import React, { useState, useEffect, useCallback } from 'react';
import { ISettings, IContextSource, IAIFunction, VerificationStatus } from '../types';
import { RefreshIcon } from './icons/RefreshIcon';

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
        const color = verificationStatus.type === 'success' ? 'text-green-400' : verificationStatus.type === 'error' ? 'text-red-400' : 'text-slate-400';
        return <span className={`text-sm ml-3 ${color}`}>{verificationStatus.message}</span>;
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <h2 className="text-3xl font-bold text-white mb-6">Settings</h2>

            <div className="space-y-6 bg-slate-800 p-6 rounded-lg overflow-y-auto">
                <section>
                    <h3 className="text-xl font-semibold text-white border-b border-slate-700 pb-2 mb-4">
                        Model Configuration
                    </h3>
                    <div className="space-y-4">
                        {/* Model Source Selector */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300">Model Source</label>
                            <select
                                value={localSettings.modelSource}
                                onChange={e => handleSourceChange(e.target.value as ISettings['modelSource'])}
                                className="mt-1 w-full max-w-md bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option>Gemini</option>
                                <option>Ollama</option>
                                <option>OpenAI</option>
                                <option>Custom</option>
                            </select>
                        </div>
                        
                        {/* Gemini Settings */}
                        {localSettings.modelSource === 'Gemini' && (
                            <div className="p-4 bg-slate-900/50 rounded-lg space-y-3">
                                <label className="block text-sm font-medium text-slate-300">Gemini API Key</label>
                                <div className="flex items-center gap-2">
                                    <input type="password" value={localSettings.geminiApiKey || ''} onChange={e => handleLocalSettingsChange({ geminiApiKey: e.target.value })} className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-blue-500 focus:border-blue-500" placeholder="AIzaSy..." />
                                    <button onClick={() => verifyAndLoadModels('Gemini', localSettings)} disabled={verificationStatus?.type === 'verifying'} className="p-2 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors disabled:opacity-50">
                                        <RefreshIcon className={`w-5 h-5 ${verificationStatus?.type === 'verifying' ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                                {renderVerificationStatus()}
                            </div>
                        )}

                        {/* Ollama Settings */}
                        {localSettings.modelSource === 'Ollama' && (
                           <div className="p-4 bg-slate-900/50 rounded-lg space-y-3">
                                <label className="block text-sm font-medium text-slate-300">Ollama API Base URL</label>
                                <div className="flex items-center gap-2">
                                     <input type="text" value={localSettings.ollamaApiUrl} onChange={e => handleLocalSettingsChange({ ollamaApiUrl: e.target.value })} className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., http://localhost:11434" />
                                     <button onClick={() => verifyAndLoadModels('Ollama', localSettings)} disabled={verificationStatus?.type === 'verifying'} className="p-2 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors disabled:opacity-50">
                                        <RefreshIcon className={`w-5 h-5 ${verificationStatus?.type === 'verifying' ? 'animate-spin' : ''}`} />
                                     </button>
                                </div>
                                {renderVerificationStatus()}
                           </div>
                        )}
                        
                        {/* OpenAI Settings */}
                        {localSettings.modelSource === 'OpenAI' && (
                            <div className="p-4 bg-slate-900/50 rounded-lg space-y-3">
                                <label className="block text-sm font-medium text-slate-300">OpenAI API Key</label>
                                <div className="flex items-center gap-2">
                                    <input type="password" value={localSettings.openaiApiKey || ''} onChange={e => handleLocalSettingsChange({ openaiApiKey: e.target.value })} className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-blue-500 focus:border-blue-500" placeholder="sk-..." />
                                    <button onClick={() => verifyAndLoadModels('OpenAI', localSettings)} disabled={verificationStatus?.type === 'verifying'} className="p-2 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors disabled:opacity-50">
                                        <RefreshIcon className={`w-5 h-5 ${verificationStatus?.type === 'verifying' ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                                {renderVerificationStatus()}
                            </div>
                        )}
                        
                        {/* Custom Provider Settings */}
                        {localSettings.modelSource === 'Custom' && (
                            <div className="p-4 bg-slate-900/50 rounded-lg space-y-3">
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-slate-300">Custom Provider Base URL</label>
                                    <input type="text" value={localSettings.customApiUrl || ''} onChange={e => handleLocalSettingsChange({ customApiUrl: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., https://api.example.com" />
                                    <p className="text-xs text-slate-500">The base URL for the OpenAI-compatible API (without '/v1').</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-slate-300">Custom Provider API Key</label>
                                    <div className="flex items-center gap-2">
                                        <input type="password" value={localSettings.customApiKey || ''} onChange={e => handleLocalSettingsChange({ customApiKey: e.target.value })} className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-blue-500 focus:border-blue-500" placeholder="Enter API Key" />
                                        <button onClick={() => verifyAndLoadModels('Custom', localSettings)} disabled={verificationStatus?.type === 'verifying'} className="p-2 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors disabled:opacity-50">
                                            <RefreshIcon className={`w-5 h-5 ${verificationStatus?.type === 'verifying' ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                    {renderVerificationStatus()}
                                </div>
                            </div>
                        )}

                        {/* Preferred Model Dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300">Preferred Model</label>
                            <select
                                value={localSettings.preferredModel}
                                onChange={e => handleLocalSettingsChange({ preferredModel: e.target.value })}
                                disabled={availableModels.length === 0 && verificationStatus?.type !== 'verifying'}
                                className="mt-1 w-full max-w-md bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-800 disabled:cursor-not-allowed"
                            >
                                {availableModels.length > 0 ? (
                                    availableModels.map(model => <option key={model} value={model}>{model}</option>)
                                ) : (
                                    <option>{verificationStatus?.type === 'verifying' ? 'Loading...' : 'Please verify connection to load models'}</option>
                                )}
                            </select>
                        </div>
                    </div>
                    <div className="mt-6">
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges}
                            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
                        >
                            Save Settings
                        </button>
                    </div>
                </section>

                <section>
                    <h3 className="text-xl font-semibold text-white border-b border-slate-700 pb-2 mb-4">User Profile</h3>
                     <p className="text-sm text-slate-400 mb-4">
                        Save your settings and context list to a file, or load them from a previous export.
                    </p>
                    <div className="flex space-x-4">
                        <button onClick={onExport} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Export Profile</button>
                        <button onClick={handleImportClick} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition-colors cursor-pointer">
                            Import Profile
                        </button>
                        {!isDesktop && (
                             <input type="file" id="import-profile-input" accept=".json" className="hidden" onChange={(e) => onImport(e as React.ChangeEvent<HTMLInputElement>)} />
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};
