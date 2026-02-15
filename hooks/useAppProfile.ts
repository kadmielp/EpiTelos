import { useState, useCallback, useRef, useEffect } from 'react';
import { ISettings, IContextSource, ISession, VerificationStatus, View } from '../types';
import { DEFAULT_SETTINGS } from '../constants';
import * as webFileService from '../services/fileService';
import * as desktopFileService from '../services/desktopFileService';

import { isDesktop } from '../services/platform';

const fileService = isDesktop ? desktopFileService : webFileService;

export const useAppProfile = () => {
    const [settings, setSettings] = useState<ISettings>(DEFAULT_SETTINGS);
    const [userAddedContexts, setUserAddedContexts] = useState<IContextSource[]>([]);
    const [showSessionModal, setShowSessionModal] = useState(false);

    const userAddedContextsRef = useRef(userAddedContexts);
    userAddedContextsRef.current = userAddedContexts;

    const saveProfile = useCallback(async (currentSettings: ISettings, currentContexts: IContextSource[]) => {
        await fileService.saveProfile({ settings: currentSettings, contexts: currentContexts });
    }, []);

    const updateSettings = useCallback((newSettings: Partial<ISettings>) => {
        setSettings(prevSettings => {
            let updated = { ...prevSettings, ...newSettings };

            if (newSettings.preferredModel !== undefined) {
                const sourceField = `${updated.modelSource.toLowerCase()}Model` as keyof ISettings;
                updated = {
                    ...updated,
                    [sourceField]: newSettings.preferredModel
                };
            }

            saveProfile(updated, userAddedContextsRef.current);
            return updated;
        });
    }, [saveProfile]);

    const saveCurrentSession = useCallback(async (sessionData: {
        selectedFunctionId: string | null;
        selectedContextIds: string[];
        userInput: string;
        isStreaming: boolean;
        showReasoning: boolean;
    }) => {
        const session: ISession = {
            lastFunctionId: sessionData.selectedFunctionId,
            lastModel: settings.preferredModel,
            lastContextIds: sessionData.selectedContextIds,
            lastUserInput: sessionData.userInput,
            isStreaming: sessionData.isStreaming,
            showReasoning: sessionData.showReasoning,
            timestamp: Date.now(),
        };
        await fileService.saveSession(session);
    }, [settings.preferredModel]);

    const exportProfile = async () => {
        const profileData = { settings, contexts: userAddedContexts };
        const profileJson = JSON.stringify(profileData, null, 2);
        if (isDesktop && window.__TAURI__) {
            // @ts-ignore
            const path = await window.__TAURI__.dialog.save({
                defaultPath: 'epitelos_profile.json',
                filters: [{ name: 'JSON', extensions: ['json'] }]
            });
            if (path) {
                // @ts-ignore
                await window.__TAURI__.fs.writeTextFile(path, profileJson);
            }
        } else {
            const blob = new Blob([profileJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'epitelos_profile.json';
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const importProfile = async (
        eventOrPath: React.ChangeEvent<HTMLInputElement> | string
    ) => {
        let profileJson: string | null = null;
        if (typeof eventOrPath === 'string' && isDesktop && window.__TAURI__) {
            // @ts-ignore
            profileJson = await window.__TAURI__.fs.readTextFile(eventOrPath);
        } else if (typeof eventOrPath !== 'string') {
            const file = eventOrPath.target.files?.[0];
            if (!file) return;
            profileJson = await file.text();
        }

        if (profileJson) {
            try {
                const importedProfile = JSON.parse(profileJson);
                const migratedSettings = { ...DEFAULT_SETTINGS, ...importedProfile.settings };
                const migratedContexts = (importedProfile.contexts || []).map((c: any) => ({
                    ...c,
                    type: c.type || 'folder',
                    isHidden: c.isHidden || false,
                    includeSubfolders: c.includeSubfolders || false
                }));
                setSettings(migratedSettings);
                setUserAddedContexts(migratedContexts);
                await saveProfile(migratedSettings, migratedContexts);
                alert('Profile imported successfully!');
            } catch {
                alert('Failed to import profile. The file might be corrupted.');
            }
        }
    };

    return {
        settings,
        setSettings,
        userAddedContexts,
        setUserAddedContexts,
        updateSettings,
        saveCurrentSession,
        exportProfile,
        importProfile,
        showSessionModal,
        setShowSessionModal,
        saveProfile,
        isDesktop
    };
};
