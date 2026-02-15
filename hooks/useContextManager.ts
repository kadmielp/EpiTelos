import { useState, useEffect, useCallback } from 'react';
import { IContextSource, ISettings } from '../types';
import * as webFileService from '../services/fileService';
import * as desktopFileService from '../services/desktopFileService';

// @ts-ignore
const isDesktop = !!window.__TAURI__;
const fileService = isDesktop ? desktopFileService : webFileService;

export const useContextManager = (
    userAddedContexts: IContextSource[],
    setUserAddedContexts: React.Dispatch<React.SetStateAction<IContextSource[]>>,
    settings: ISettings,
    saveProfile: (settings: ISettings, contexts: IContextSource[]) => Promise<void>
) => {
    const [displayContexts, setDisplayContexts] = useState<IContextSource[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const expandContextsForDisplay = async () => {
            const allDisplayContexts: IContextSource[] = [];
            for (const source of userAddedContexts) {
                if (source.type === 'file') {
                    allDisplayContexts.push({ ...source, isUserAdded: true });
                } else {
                    allDisplayContexts.push({ ...source, isFolderMarker: true, isUserAdded: true });
                    const files = await fileService.expandFolderSource(source);
                    allDisplayContexts.push(...files);
                }
            }
            setDisplayContexts(allDisplayContexts);
        };
        expandContextsForDisplay();
    }, [userAddedContexts, refreshKey]);

    const addContext = async (
        path: string,
        remark: string,
        type: 'folder' | 'file',
        includeSubfolders: boolean
    ) => {
        if (userAddedContexts.some(c => c.path === path)) {
            alert("This context source has already been added.");
            return;
        }
        const newSource: IContextSource = {
            id: `ctx-${path.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
            path,
            remark,
            type,
            includeSubfolders: type === 'folder' ? includeSubfolders : false,
            isHidden: false
        };
        const newContexts = [...userAddedContexts, newSource];
        setUserAddedContexts(newContexts);
        saveProfile(settings, newContexts);
    };

    const removeContexts = (idsToRemove: string[]) => {
        if (!idsToRemove.length) return;
        const newContexts = [...userAddedContexts];
        const contextsToReallyRemove: string[] = [];
        let modified = false;

        for (const id of idsToRemove) {
            const sourceToRemove = displayContexts.find(c => c.id === id);
            if (!sourceToRemove) continue;

            if (sourceToRemove.isUserAdded) {
                contextsToReallyRemove.push(id);
                modified = true;
            } else {
                const parentFolderIndex = newContexts.findIndex(c =>
                    c.type === 'folder' &&
                    sourceToRemove.path.startsWith(c.path)
                );
                if (parentFolderIndex !== -1) {
                    const parentFolder = { ...newContexts[parentFolderIndex] };
                    parentFolder.excludedPaths = [
                        ...(parentFolder.excludedPaths || []),
                        sourceToRemove.path
                    ];
                    newContexts[parentFolderIndex] = parentFolder;
                    modified = true;
                }
            }
        }

        const finalContexts = newContexts.filter(c => !contextsToReallyRemove.includes(c.id));
        if (modified) {
            setUserAddedContexts(finalContexts);
            saveProfile(settings, finalContexts);
        }
    };

    const toggleContextVisibility = (contextId: string) => {
        const sourceToToggle = displayContexts.find(c => c.id === contextId);
        if (!sourceToToggle) return;

        const newContexts = userAddedContexts.map(c => ({ ...c }));
        let modified = false;

        if (sourceToToggle.isUserAdded) {
            const index = newContexts.findIndex(c => c.id === contextId);
            if (index > -1) {
                newContexts[index].isHidden = !newContexts[index].isHidden;
                if (newContexts[index].type === 'folder') {
                    delete newContexts[index].overrideHidden;
                }
                modified = true;
            }
        } else {
            const parentFolderIndex = newContexts.findIndex(c =>
                c.type === 'folder' && sourceToToggle.path.startsWith(c.path)
            );
            if (parentFolderIndex > -1) {
                const parentFolder = newContexts[parentFolderIndex];
                parentFolder.overrideHidden = {
                    ...(parentFolder.overrideHidden || {}),
                    [sourceToToggle.path]: !sourceToToggle.isHidden
                };
                modified = true;
            }
        }

        if (modified) {
            setUserAddedContexts(newContexts);
            saveProfile(settings, newContexts);
        }
    };

    const handleRefreshAllFolders = () => {
        if (userAddedContexts.some(c => c.type === 'folder' && c.includeSubfolders)) {
            setRefreshKey(prev => prev + 1);
        }
    };

    return {
        displayContexts,
        addContext,
        removeContexts,
        toggleContextVisibility,
        handleRefreshAllFolders
    };
};
