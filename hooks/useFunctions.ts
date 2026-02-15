import { useState, useCallback } from 'react';
import { IAIFunction } from '../types';
import * as webFileService from '../services/fileService';
import * as desktopFileService from '../services/desktopFileService';

// @ts-ignore
const isDesktop = !!window.__TAURI__;
const fileService = isDesktop ? desktopFileService : webFileService;

export const useFunctions = () => {
    const [functions, setFunctions] = useState<IAIFunction[]>([]);

    const loadFunctions = useCallback(async () => {
        const loadedFuncs = await fileService.getFunctions();
        setFunctions(loadedFuncs);
        return loadedFuncs;
    }, []);

    const saveFunction = async (func: Partial<IAIFunction>) => {
        await fileService.saveFunction(func);
        await loadFunctions();
    };

    const deleteFunction = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this custom function?")) {
            await fileService.deleteFunction(id);
            await loadFunctions();
        }
    };

    return {
        functions,
        setFunctions,
        loadFunctions,
        saveFunction,
        deleteFunction,
    };
};
