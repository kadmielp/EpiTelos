
import { IAIFunction, IContextSource, ISettings, ISession } from '../types';

/**
 * NOTE: This service provides REAL local file system interactions using the Tauri API.
 * It is used when the application is running as a desktop executable.
 */

// Define the shape of the Tauri API so TypeScript doesn't complain.
// This will be available on the `window` object in a Tauri app.
declare global {
    interface Window {
        __TAURI__: {
            fs: {
                readTextFile(path: string): Promise<string>;
                writeTextFile(path: string, contents: string): Promise<void>;
                readDir(path: string, options?: { recursive?: boolean }): Promise<any[]>;
                exists(path: string): Promise<boolean>;
                createDir(path: string, options?: { recursive?: boolean }): Promise<void>;
                removeFile(path: string): Promise<void>;
                removeDir(path: string, options?: { recursive?: boolean }): Promise<void>;
            };
            path: {
                appDataDir(): Promise<string>;
                join(...paths: string[]): Promise<string>;
            };
            dialog: {
                open(options: any): Promise<string | string[] | null>;
                save(options: any): Promise<string | null>;
            }
        };
    }
}

const tauri = window.__TAURI__;

// --- App Data Paths ---

const getAppDir = async () => {
    const appDataDirPath = await tauri.path.appDataDir();
    if (!(await tauri.fs.exists(appDataDirPath))) {
        await tauri.fs.createDir(appDataDirPath, { recursive: true });
    }
    return appDataDirPath;
};

const getProfilePath = async () => tauri.path.join(await getAppDir(), 'profile.json');
const getSessionPath = async () => tauri.path.join(await getAppDir(), 'session.json');
const getCustomFuncsPath = async () => tauri.path.join(await getAppDir(), 'functions_custom');

// --- AI Function Management ---

export const getFunctions = async (): Promise<IAIFunction[]> => {
    // 1. Load built-in functions via the web service. In a real build, these would be packaged.
    const webService = getWebFileService();
    const builtInFuncs = (await webService.getFunctions()).filter(f => !f.isCustom);

    // 2. Load custom functions from the local file system.
    const customFuncsDir = await getCustomFuncsPath();
    if (!(await tauri.fs.exists(customFuncsDir))) {
        await tauri.fs.createDir(customFuncsDir, { recursive: true });
        return builtInFuncs;
    }

    const customFuncs: IAIFunction[] = [];
    const entries = await tauri.fs.readDir(customFuncsDir);

    for (const entry of entries) {
        // A function is represented by a directory containing manifest.json and system.md
        if (entry.children) {
            const funcId = entry.name; // The directory name is the function ID
            const manifestPath = await tauri.path.join(entry.path, 'manifest.json');
            const systemPath = await tauri.path.join(entry.path, 'system.md');

            if (await tauri.fs.exists(manifestPath) && await tauri.fs.exists(systemPath)) {
                try {
                    const manifestContent = await tauri.fs.readTextFile(manifestPath);
                    const manifest = JSON.parse(manifestContent);
                    const systemPrompt = await tauri.fs.readTextFile(systemPath);

                    // The ID from the directory name is the source of truth
                    customFuncs.push({ ...manifest, id: funcId, systemPrompt, isCustom: true });
                } catch (e) {
                    console.error(`Failed to load custom function from ${entry.path}:`, e)
                }
            }
        }
    }

    return [...builtInFuncs, ...customFuncs];
};

export const saveFunction = async (func: Partial<IAIFunction>): Promise<void> => {
    const customFuncsDir = await getCustomFuncsPath();
    if (!(await tauri.fs.exists(customFuncsDir))) {
        await tauri.fs.createDir(customFuncsDir, { recursive: true });
    }

    const funcId = func.id && func.isCustom ? func.id : `func-custom-${Date.now()}`;
    const funcDir = await tauri.path.join(customFuncsDir, funcId);

    if (!(await tauri.fs.exists(funcDir))) {
        await tauri.fs.createDir(funcDir, { recursive: true });
    }

    // Ensure the manifest ID matches the directory/true ID
    const manifest = { ...func, id: funcId, isCustom: true };
    delete manifest.systemPrompt; // Don't store prompt in manifest

    const manifestPath = await tauri.path.join(funcDir, 'manifest.json');
    const systemPath = await tauri.path.join(funcDir, 'system.md');

    await tauri.fs.writeTextFile(manifestPath, JSON.stringify(manifest, null, 2));
    await tauri.fs.writeTextFile(systemPath, func.systemPrompt || '');
};

export const deleteFunction = async (functionId: string): Promise<void> => {
    const customFuncsDir = await getCustomFuncsPath();
    const funcDir = await tauri.path.join(customFuncsDir, functionId);

    if (await tauri.fs.exists(funcDir)) {
        await tauri.fs.removeDir(funcDir, { recursive: true });
    } else {
        console.warn(`Attempted to delete non-existent function directory: ${funcDir}`);
    }
};

// --- Context File Reading ---

async function* walk(dir: string): AsyncGenerator<string> {
    const entries = await tauri.fs.readDir(dir, { recursive: true });

    async function* processEntries(items: any[]): AsyncGenerator<string> {
        for (const item of items) {
            if (item.children) { // It's a directory, recurse into its children
                yield* processEntries(item.children);
            } else { // It's a file
                yield item.path;
            }
        }
    }

    yield* processEntries(entries);
}

export const expandFolderSource = async (source: IContextSource): Promise<IContextSource[]> => {
    if (source.type !== 'folder') return [source];

    if (!await tauri.fs.exists(source.path)) {
        console.error(`Folder path not found: ${source.path}`);
        return [];
    }

    const fileContexts: IContextSource[] = [];
    const files = await tauri.fs.readDir(source.path, { recursive: source.includeSubfolders });

    const processEntries = (entries: any[]) => {
        for (const entry of entries) {
            if (entry.children) { // Directory
                processEntries(entry.children);
            } else { // File
                const filePath = entry.path;
                if (source.excludedPaths?.includes(filePath)) continue;

                const pathParts = filePath.replace(/\\/g, '/').split('/');
                const fileName = pathParts.pop() || '';
                const remark = fileName.includes('.') ? fileName.split('.').slice(0, -1).join('.') : fileName;
                const isHiddenOverride = source.overrideHidden?.[filePath];

                fileContexts.push({
                    id: `ctx-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
                    path: filePath,
                    remark: remark,
                    type: 'file',
                    isHidden: typeof isHiddenOverride === 'boolean' ? isHiddenOverride : source.isHidden,
                    includeSubfolders: false,
                });
            }
        }
    };

    processEntries(files);

    return fileContexts;
};


export const readSingleContextSource = async (source: IContextSource): Promise<string> => {
    try {
        if (!await tauri.fs.exists(source.path)) {
            return `[ERROR: Path not found: ${source.path}]`;
        }

        if (source.type === 'file') {
            const header = `--- Start of Context from FILE: "${source.remark}" (${source.path}) ---\n`;
            const footer = `--- End of Context from: "${source.remark}" ---\n`;
            const body = await tauri.fs.readTextFile(source.path);
            return `${header}${body}\n${footer}`;
        } else { // 'folder'
            let content = `--- Start of Context from folder: "${source.remark}" (${source.path}) ---\n\n`;

            const files = await tauri.fs.readDir(source.path, { recursive: source.includeSubfolders });
            const filePaths: string[] = [];

            const collectPaths = (entries: any[]) => {
                for (const entry of entries) {
                    if (entry.children) {
                        collectPaths(entry.children);
                    } else {
                        if (!source.excludedPaths?.includes(entry.path)) {
                            filePaths.push(entry.path);
                        }
                    }
                }
            };
            collectPaths(files);

            for await (const path of filePaths) {
                content += `--- File: ${path} ---\n`;
                content += await tauri.fs.readTextFile(path);
                content += `\n\n`;
            }

            content += `--- End of context from folder: "${source.remark}" ---`;
            return content;
        }
    } catch (e) {
        console.error(`Error reading context source ${source.path}:`, e);
        return `[ERROR: Could not read content for ${source.path}. Check permissions.]`;
    }
};

export const readContextSources = async (sources: IContextSource[]): Promise<string> => {
    if (sources.length === 0) return "";
    const contentPromises = sources.map(source => readSingleContextSource(source));
    const allContent = await Promise.all(contentPromises);
    return allContent.join('\n\n');
};

export const getRawContextForInspection = async (source: IContextSource): Promise<string> => {
    try {
        if (!await tauri.fs.exists(source.path)) {
            return `[ERROR: Path not found: ${source.path}]`;
        }

        if (source.type === 'file') {
            return await tauri.fs.readTextFile(source.path);
        } else { // 'folder'
            const fileContents: string[] = [];
            const files = await tauri.fs.readDir(source.path, { recursive: source.includeSubfolders });
            const filePaths: string[] = [];

            const collectPaths = (entries: any[]) => {
                for (const entry of entries) {
                    if (entry.children) {
                        collectPaths(entry.children);
                    } else {
                        if (!source.excludedPaths?.includes(entry.path)) {
                            filePaths.push(entry.path);
                        }
                    }
                }
            };
            collectPaths(files);

            for await (const path of filePaths) {
                const fileName = path.split(/[\\/]/).pop();
                const content = await tauri.fs.readTextFile(path);
                fileContents.push(`--- ${fileName} ---\n${content}`);
            }

            if (fileContents.length === 0) {
                return "(This folder is empty or all files are excluded.)";
            }

            return fileContents.join('\n\n');
        }
    } catch (e) {
        console.error(`Error reading context source for inspection ${source.path}:`, e);
        return `[ERROR: Could not read content for ${source.path}. Check permissions.]`;
    }
};

// --- Secure Storage (Keychain) Interface ---

const invoke = (window as any).__TAURI__?.invoke;

const setSecret = async (key: string, value: string): Promise<boolean> => {
    if (!invoke) return false;
    try {
        const response: { success: boolean, error?: string } = await invoke('set_secret', { service: 'epitelos', key, value });
        return response.success;
    } catch (e) {
        console.error(`Failed to set secret ${key}:`, e);
        return false;
    }
};

const getSecret = async (key: string): Promise<string | null> => {
    if (!invoke) return null;
    try {
        const response: { success: boolean, data?: string, error?: string } = await invoke('get_secret', { service: 'epitelos', key });
        return response.success ? response.data || null : null;
    } catch (e) {
        console.error(`Failed to get secret ${key}:`, e);
        return null;
    }
};

const deleteSecret = async (key: string): Promise<boolean> => {
    if (!invoke) return false;
    try {
        const response: { success: boolean, error?: string } = await invoke('delete_secret', { service: 'epitelos', key });
        return response.success;
    } catch (e) {
        console.error(`Failed to delete secret ${key}:`, e);
        return false;
    }
};

const SENSITIVE_FIELDS: (keyof ISettings)[] = [
    'apiKey',
    'geminiApiKey',
    'openaiApiKey',
    'customApiKey',
    'maritacaApiKey'
];


// --- Profile & Session Management ---

export const saveProfile = async (profileData: { settings: ISettings; contexts: IContextSource[] }): Promise<void> => {
    // 1. Extract and save secrets to Keychain
    const settings = { ...profileData.settings };
    for (const field of SENSITIVE_FIELDS) {
        const value = settings[field] as string;
        if (value) {
            await setSecret(field, value);
            // 2. Remove from the settings object before saving to disk
            // @ts-ignore - we want to remove the actual value but keep the type happy enough for saving
            settings[field] = 'KEYCHAIN_STORED';
        } else {
            await deleteSecret(field);
            // @ts-ignore
            settings[field] = '';
        }
    }

    const dataToSave = { ...profileData, settings };
    await tauri.fs.writeTextFile(await getProfilePath(), JSON.stringify(dataToSave, null, 2));
};

export const loadProfile = async (): Promise<{ settings: ISettings; contexts: IContextSource[] } | null> => {
    const path = await getProfilePath();
    if (await tauri.fs.exists(path)) {
        try {
            const content = await tauri.fs.readTextFile(path);
            const profile = JSON.parse(content);
            const settings = profile.settings as ISettings;

            let migrated = false;

            // 1. Fetch secrets from Keychain and migrate if necessary
            for (const field of SENSITIVE_FIELDS) {
                const valueInFile = settings[field] as string;
                const secureValue = await getSecret(field);

                if (valueInFile && valueInFile !== 'KEYCHAIN_STORED' && valueInFile !== '') {
                    // MIGRATION: Secret found in plain text JSON. Move it to Keychain.
                    console.log(`Migrating ${field} to secure storage...`);
                    await setSecret(field, valueInFile);
                    // @ts-ignore
                    settings[field] = secureValue || valueInFile;
                    migrated = true;
                } else {
                    // Standard load: fetch from Keychain
                    // @ts-ignore
                    settings[field] = secureValue || '';
                }
            }

            if (migrated) {
                // If we migrated something, save the cleaned-up profile immediately
                console.log("Migration complete. Saving secured profile.");
                await saveProfile({ settings, contexts: profile.contexts });
            }

            return { ...profile, settings };
        } catch (e) {
            console.error("Failed to parse profile.json:", e);
            return null;
        }
    }
    return null; // Let App.tsx create a default one
};

export const saveSession = async (session: ISession): Promise<void> => {
    await tauri.fs.writeTextFile(await getSessionPath(), JSON.stringify(session, null, 2));
};

export const loadSession = async (): Promise<ISession | null> => {
    const path = await getSessionPath();
    if (await tauri.fs.exists(path)) {
        try {
            const content = await tauri.fs.readTextFile(path);
            return JSON.parse(content);
        } catch (e) {
            console.error("Failed to parse session.json:", e);
            return null;
        }
    }
    return null;
};

export const clearSession = async (): Promise<void> => {
    const path = await getSessionPath();
    if (await tauri.fs.exists(path)) {
        await tauri.fs.removeFile(path);
    }
}

// A little hack to get web-based file service for built-in functions
import * as webFileService from './fileService';
const getWebFileService = () => webFileService;