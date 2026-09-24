import { useLanguage } from '../../i18n';
import React from 'react';
import { ISettings, VerificationStatus } from '../../types';
import * as localGgufService from '../../services/localGgufService';
import { modelDisplayName } from '../../services/modelDisplayName';

interface ModelSourceConfigProps {
    settings: ISettings;
    updateSettings: (s: Partial<ISettings>) => void;
    availableModels: string[];
    verificationStatus: VerificationStatus | null;
    verifyAndLoadModels: (source: ISettings['modelSource'], settings: ISettings) => void;
}

export const ModelSourceConfig: React.FC<ModelSourceConfigProps> = ({
    settings,
    updateSettings,
    availableModels,
    verificationStatus,
    verifyAndLoadModels
}) => {
    const { t } = useLanguage();
    const sources = ['Local', 'Gemini', 'OpenAI', 'Maritaca', 'Custom'] as const;
    const isLocalSource = settings.modelSource === 'Ollama' || settings.modelSource === 'Local GGUF';
    const addModel = async () => {
        if (!window.__TAURI__) return;
        const selected = await window.__TAURI__.dialog.open({ multiple: true, filters: [{ name: 'GGUF models', extensions: ['gguf'] }] });
        if (!selected) return;
        const paths = Array.isArray(selected) ? selected : [selected];
        try {
            const validated = await Promise.all(paths.map(path => localGgufService.validateModel(path)));
            const models = [...new Set([...(settings.localGgufModels || []), ...validated])];
            updateSettings({ localGgufModels: models, preferredModel: settings.preferredModel || models[0] });
        } catch (error) {
            alert(error instanceof Error ? error.message : String(error));
        }
    };
    const removeModel = (path: string) => {
        const models = (settings.localGgufModels || []).filter(model => model !== path);
        updateSettings({ localGgufModels: models, preferredModel: settings.preferredModel === path ? (models[0] || '') : settings.preferredModel });
    };

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-6 bg-neutral-700 rounded-full" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white">{t('AI provider')}</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {sources.map(source => (
                    <button
                        key={source}
                        onClick={() => updateSettings({ modelSource: source === 'Local' ? (isLocalSource ? settings.modelSource : 'Ollama') : source })}
                        aria-pressed={source === 'Local' ? isLocalSource : settings.modelSource === source}
                        className={`px-4 py-3 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${(source === 'Local' ? isLocalSource : settings.modelSource === source)
                            ? 'bg-neutral-700/20 border-neutral-500 text-neutral-200 '
                            : 'bg-white/5 border-white/5 text-neutral-400 hover:border-white/10 hover:bg-white/10'
                            }`}
                    >
                        {source}
                    </button>
                ))}
            </div>

            {isLocalSource && (
                <div className="grid grid-cols-2 gap-3" aria-label="Local model source">
                    {(['Ollama', 'Local GGUF'] as const).map(source => (
                        <button
                            key={source}
                            onClick={() => updateSettings({ modelSource: source })}
                            disabled={source === 'Local GGUF' && !window.__TAURI__}
                            aria-pressed={settings.modelSource === source}
                            title={source === 'Local GGUF' && !window.__TAURI__ ? t('Requires the Windows desktop app') : undefined}
                            className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${settings.modelSource === source
                                ? 'border-neutral-400 bg-white/10 text-white'
                                : 'border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {source === 'Local GGUF' ? 'GGUF' : source}
                        </button>
                    ))}
                </div>
            )}

            <div className="surface-card border rounded-3xl p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Side: Keys & URLs */}
                    <div className="space-y-6">
                        {settings.modelSource === 'Gemini' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">{t('Gemini API Key')}</label>
                                <input
                                    type="password"
                                    placeholder={t('Enter your Google AI API key')}
                                    value={settings.geminiApiKey || ''}
                                    onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
                                    className="w-full bg-neutral-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-neutral-500/50 outline-none transition-all"
                                />
                            </div>
                        )}

                        {settings.modelSource === 'Ollama' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Ollama API URL</label>
                                <input
                                    type="text"
                                    placeholder="http://localhost:11434"
                                    value={settings.ollamaApiUrl || ''}
                                    onChange={(e) => updateSettings({ ollamaApiUrl: e.target.value })}
                                    className="w-full bg-neutral-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-neutral-500/50 outline-none transition-all"
                                />
                            </div>
                        )}

                        {settings.modelSource === 'Local GGUF' && (
                            <div className="space-y-3">
                                <p className="text-xs text-neutral-400">{t('Choose downloaded GGUF files. One model runs at a time.')}</p>
                                <button onClick={addModel} className="px-4 py-2 rounded-xl border border-white/10 text-sm text-white hover:bg-white/10">{t('Add GGUF files')}</button>
                                <div className="space-y-1 max-h-36 overflow-y-auto">
                                    {(settings.localGgufModels || []).map(path => (
                                        <div key={path} className="flex items-center gap-2 text-xs text-neutral-300">
                                            <span className="truncate">{modelDisplayName(path)}</span>
                                            <button onClick={() => removeModel(path)} aria-label={`${t('Remove ')}${path}`} className="text-neutral-400 hover:text-white">{t('Remove')}</button>
                                        </div>
                                    ))}
                                </div>
                                <label className="block text-xs text-neutral-400">{t('Runtime')}</label>
                                <select value={settings.localGgufBackend || 'auto'} onChange={e => updateSettings({ localGgufBackend: e.target.value as ISettings['localGgufBackend'] })} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white">
                                    <option value="auto">{t('Automatic GPU or CPU')}</option><option value="cpu">CPU</option><option value="cuda">CUDA</option><option value="vulkan">Vulkan</option>
                                </select>
                                <p className="text-xs text-neutral-400">{t('If a GPU fails to load, select CPU and refresh models.')}</p>
                                <label className="block text-xs text-neutral-400">{t('Context window (tokens)')}</label>
                                <select value={settings.localGgufContextSize || 8192} onChange={e => updateSettings({ localGgufContextSize: Number(e.target.value) as ISettings['localGgufContextSize'] })} className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white">
                                    <option value={4096}>4,096</option><option value={8192}>8,192</option><option value={16384}>16,384</option>
                                </select>
                                <p className="text-xs text-neutral-400">{t('A larger context window fits more sources but uses more memory. Changing it reloads the model.')}</p>
                            </div>
                        )}

                        {settings.modelSource === 'OpenAI' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">{t('OpenAI API Key')}</label>
                                <input
                                    type="password"
                                    placeholder="sk-..."
                                    value={settings.openaiApiKey || ''}
                                    onChange={(e) => updateSettings({ openaiApiKey: e.target.value })}
                                    className="w-full bg-neutral-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-neutral-500/50 outline-none transition-all"
                                />
                            </div>
                        )}

                        {settings.modelSource === 'Maritaca' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">{t('Maritaca API Key')}</label>
                                <input
                                    type="password"
                                    placeholder={t('Enter Maritaca key')}
                                    value={settings.maritacaApiKey || ''}
                                    onChange={(e) => updateSettings({ maritacaApiKey: e.target.value })}
                                    className="w-full bg-neutral-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-neutral-500/50 outline-none transition-all"
                                />
                            </div>
                        )}

                        {settings.modelSource === 'Custom' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">{t('Base URL')}</label>
                                    <input
                                        type="text"
                                        placeholder="https://api.example.com/v1"
                                        value={settings.customApiUrl || ''}
                                        onChange={(e) => updateSettings({ customApiUrl: e.target.value })}
                                        className="w-full bg-neutral-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-neutral-500/50 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">{t('API Key')}</label>
                                    <input
                                        type="password"
                                        placeholder="sk-..."
                                        value={settings.customApiKey || ''}
                                        onChange={(e) => updateSettings({ customApiKey: e.target.value })}
                                        className="w-full bg-neutral-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-neutral-500/50 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="pt-2 flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => verifyAndLoadModels(settings.modelSource, settings)}
                                className="shrink-0 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-neutral-200 transition-all active:scale-95"
                            >
                                {t(settings.modelSource === 'Local GGUF' ? 'Load Model' : 'Refresh Models')}
                            </button>

                            {verificationStatus && (
                                <div role={verificationStatus.type === 'error' ? 'alert' : 'status'} className={`flex min-w-0 items-start gap-2 px-3 py-2 rounded-lg border bg-neutral-500/10 border-neutral-500/20 text-neutral-200 ${verificationStatus.type === 'error' ? 'w-full' : 'max-w-full'}`}>
                                    <div className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${verificationStatus.type === 'success' ? 'bg-neutral-500 animate-pulse' :
                                        verificationStatus.type === 'error' ? 'bg-neutral-500' : 'bg-neutral-500 animate-spin'
                                        }`} />
                                    <span className={`min-w-0 text-xs leading-relaxed text-neutral-200 ${verificationStatus.type === 'error' ? 'break-all' : ''}`}>{verificationStatus.message}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Preferred Model selection */}
                    <div className="space-y-2 border-l border-white/5 pl-0 lg:pl-8">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">
                            {t('Preferred Model')} ({availableModels.length} {t('available')})
                        </label>
                        <select
                            value={settings.preferredModel}
                            onChange={(e) => updateSettings({ preferredModel: e.target.value })}
                            className="w-full bg-neutral-950/50 border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:border-neutral-500/50 outline-none transition-all cursor-pointer appearance-none shadow-inner"
                        >
                            <option value="" className="bg-neutral-900">{t('Select an active model...')}</option>
                            {availableModels.map(model => (
                                <option key={model} value={model} className="bg-neutral-900">{modelDisplayName(model)}</option>
                            ))}
                        </select>
                        <p className="text-[9px] text-neutral-400 italic mt-2 ml-1">
                            {t('This model will be used for new runs.')}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};
