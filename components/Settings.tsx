import React, { useRef } from 'react';
import { ISettings, IContextSource, IAIFunction, VerificationStatus } from '../types';
import { ModelSourceConfig } from './settings/ModelSourceConfig';
import { ExportIcon } from './icons/ExportIcon';
import { ImportIcon } from './icons/ImportIcon';
import { useLanguage } from '../i18n';

interface SettingsProps {
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
    const { t } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="settings-page h-full flex flex-col overflow-hidden">
            {/* Header */}
            <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-neutral-900/40 backdrop-blur-3xl shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-neutral-500 " />
                    <div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300">{t('WORKSPACE / SETTINGS')}</h2>
                        <h1 className="text-xl font-bold text-white tracking-tight">{t('Settings')}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onExport}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-neutral-200 transition-all active:scale-95"
                    >
                        <ExportIcon className="w-3.5 h-3.5" /> {t('Export Profile')}
                    </button>
                    <button
                        onClick={handleImportClick}
                        className="flex items-center gap-2 px-5 py-2.5 bg-neutral-700/10 hover:bg-neutral-700/20 border border-neutral-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-neutral-200 transition-all active:scale-95"
                    >
                        <ImportIcon className="w-3.5 h-3.5" /> {t('Import Profile')}
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
                        <div className="w-1.5 h-6 bg-neutral-700 rounded-full" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">{t('Preferences')}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="surface-card border rounded-3xl p-6 flex flex-col justify-center gap-3">
                            <label htmlFor="app-language" className="text-xs font-bold text-white">{t('Language')}</label>
                            <p className="text-[10px] text-neutral-400">{t('Interface and default response language.')}</p>
                            <select id="app-language" value={settings.language} onChange={event => updateSettings({ language: event.target.value as ISettings['language'] })}
                                className="w-full rounded-xl border border-white/10 bg-neutral-800 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                                <option value="en">EN — English</option>
                                <option value="pt-BR">PT-BR — Português (Brasil)</option>
                            </select>
                        </div>
                        <div className="surface-card border rounded-3xl p-6 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-white mb-1">{t('Process Notifications')}</p>
                                <p className="text-[10px] text-neutral-400 leading-relaxed max-w-[200px]">{t('Play sound and show system alerts when AI finishes processing.')}</p>
                            </div>
                            <button
                                onClick={() => updateSettings({ notificationEnabled: !settings.notificationEnabled })}
                                aria-label={t('Process notifications')}
                                aria-pressed={!!settings.notificationEnabled}
                                className={`w-12 h-6 rounded-full transition-all relative ${settings.notificationEnabled ? 'bg-neutral-700' : 'bg-white/10'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.notificationEnabled ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                    </div>
                </section>
            </div>

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
      `}</style>
        </div>
    );
};
