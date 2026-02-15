import React from 'react';
import { ISettings, VerificationStatus } from '../../types';

interface ModelSourceConfigProps {
    settings: ISettings;
    updateSettings: (s: Partial<ISettings>) => void;
    verificationStatus: VerificationStatus | null;
    verifyAndLoadModels: (source: ISettings['modelSource'], settings: ISettings) => void;
}

export const ModelSourceConfig: React.FC<ModelSourceConfigProps> = ({
    settings,
    updateSettings,
    verificationStatus,
    verifyAndLoadModels
}) => {
    const sources: ISettings['modelSource'][] = ['Gemini', 'Ollama', 'OpenAI', 'Maritaca', 'Custom'];

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Intelligence Provider</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {sources.map(source => (
                    <button
                        key={source}
                        onClick={() => updateSettings({ modelSource: source })}
                        className={`px-4 py-3 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${settings.modelSource === source
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                            : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10 hover:bg-white/10'
                            }`}
                    >
                        {source}
                    </button>
                ))}
            </div>

            <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 space-y-6">
                {settings.modelSource === 'Gemini' && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Gemini API Key</label>
                        <input
                            type="password"
                            placeholder="Enter your Google AI API key"
                            value={settings.geminiApiKey || ''}
                            onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                        />
                    </div>
                )}

                {settings.modelSource === 'Ollama' && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Ollama API URL</label>
                        <input
                            type="text"
                            placeholder="http://localhost:11434"
                            value={settings.ollamaApiUrl || ''}
                            onChange={(e) => updateSettings({ ollamaApiUrl: e.target.value })}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                        />
                    </div>
                )}

                {settings.modelSource === 'OpenAI' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">OpenAI API Key</label>
                            <input
                                type="password"
                                placeholder="sk-..."
                                value={settings.openaiApiKey || ''}
                                onChange={(e) => updateSettings({ openaiApiKey: e.target.value })}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                            />
                        </div>
                    </div>
                )}

                {settings.modelSource === 'Maritaca' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Maritaca API Key</label>
                            <input
                                type="password"
                                placeholder="Enter Maritaca key"
                                value={settings.maritacaApiKey || ''}
                                onChange={(e) => updateSettings({ maritacaApiKey: e.target.value })}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                            />
                        </div>
                    </div>
                )}

                {settings.modelSource === 'Custom' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Base URL</label>
                            <input
                                type="text"
                                placeholder="https://api.example.com/v1"
                                value={settings.customApiUrl || ''}
                                onChange={(e) => updateSettings({ customApiUrl: e.target.value })}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">API Key</label>
                            <input
                                type="password"
                                placeholder="sk-..."
                                value={settings.customApiKey || ''}
                                onChange={(e) => updateSettings({ customApiKey: e.target.value })}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                            />
                        </div>
                    </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                    <button
                        onClick={() => verifyAndLoadModels(settings.modelSource, settings)}
                        className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all active:scale-95"
                    >
                        Refresh Models
                    </button>

                    {verificationStatus && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${verificationStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            verificationStatus.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${verificationStatus.type === 'success' ? 'bg-emerald-500 animate-pulse' :
                                verificationStatus.type === 'error' ? 'bg-red-500' : 'bg-blue-500 animate-spin'
                                }`} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{verificationStatus.message}</span>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};
