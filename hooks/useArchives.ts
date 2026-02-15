
import { useState, useCallback, useEffect } from 'react';
import { IArchive } from '../types';
import * as webFileService from '../services/fileService';
import * as desktopFileService from '../services/desktopFileService';
import { isDesktop } from '../services/platform';

const fileService = isDesktop ? desktopFileService : webFileService;

export const useArchives = () => {
    const [archives, setArchives] = useState<IArchive[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadArchives = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fileService.getArchives();
            setArchives(data);
        } catch (error) {
            console.error('Failed to load archives:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const addArchive = useCallback(async (archive: IArchive) => {
        try {
            await fileService.saveArchive(archive);
            setArchives(prev => [archive, ...prev]);
        } catch (error) {
            console.error('Failed to save archive:', error);
        }
    }, []);

    const removeArchive = useCallback(async (id: string) => {
        try {
            await fileService.deleteArchive(id);
            setArchives(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error('Failed to delete archive:', error);
        }
    }, []);

    useEffect(() => {
        loadArchives();
    }, [loadArchives]);

    return {
        archives,
        isLoading,
        loadArchives,
        addArchive,
        removeArchive
    };
};
