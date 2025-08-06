
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
                } catch(e) {
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
                for(const entry of entries) {
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
                for(const entry of entries) {
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

// --- Profile & Session Management ---

export const saveProfile = async (profileData: { settings: ISettings; contexts: IContextSource[] }): Promise<void> => {
  await tauri.fs.writeTextFile(await getProfilePath(), JSON.stringify(profileData, null, 2));
};

export const loadProfile = async (): Promise<{ settings: ISettings; contexts: IContextSource[] } | null> => {
  const path = await getProfilePath();
  if (await tauri.fs.exists(path)) {
    try {
        const content = await tauri.fs.readTextFile(path);
        return JSON.parse(content);
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
    } catch(e) {
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