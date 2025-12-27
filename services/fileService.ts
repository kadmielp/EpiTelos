
import { IAIFunction, IContextSource, ISettings } from '../types';
import { PROFILE_STORAGE_KEY, SESSION_STORAGE_KEY, DEFAULT_SETTINGS } from '../constants';

/**
 * NOTE: This service mocks local file system interactions.
 * - Built-in AI Functions are read from the `/functions` directory at startup. They are read-only.
 * - Custom AI Functions are stored in localStorage.
 * - Context, Profile, and Session data are managed via localStorage for persistence.
 */

const CUSTOM_FUNCTIONS_STORAGE_KEY = 'epitelos_custom_functions';

const MOCK_SAMPLE_FILES = [
  '/contexts_sample/Da Vinci - Milano - Automata Cavaliere (1495).md',
];


// --- AI Function Management ---

export const getFunctions = async (): Promise<IAIFunction[]> => {
  // 1. Load built-in functions from the pre-generated JSON file
  let resolvedBuiltInFuncs: IAIFunction[] = [];
  try {
    const response = await fetch(`/built-in-functions.json?t=${Date.now()}`); // Bust cache
    if (!response.ok) {
      throw new Error(`Could not load built-in-functions.json: ${response.statusText}`);
    }
    const builtInFuncs = await response.json();
    // Ensure the loaded data is in the correct format
    resolvedBuiltInFuncs = builtInFuncs.map((f: any) => ({
      id: f.id,
      name: f.name,
      systemPrompt: f.systemPrompt,
      description: f.description,
      category: f.category,
      isCustom: false, // Explicitly set
    }));
  } catch (error) {
    console.error("Failed to load built-in functions:", error);
    // Continue without built-in functions if manifest fails
  }

  // 2. Load custom functions from localStorage
  const customFuncsJson = localStorage.getItem(CUSTOM_FUNCTIONS_STORAGE_KEY);
  const customFuncs: IAIFunction[] = customFuncsJson ? JSON.parse(customFuncsJson) : [];

  return [...resolvedBuiltInFuncs, ...customFuncs];
};

export const saveFunction = async (func: Partial<IAIFunction>): Promise<void> => {
  const customFuncsJson = localStorage.getItem(CUSTOM_FUNCTIONS_STORAGE_KEY);
  let customFuncs: IAIFunction[] = customFuncsJson ? JSON.parse(customFuncsJson) : [];

  if (func.id && func.isCustom) {
    // Editing an existing custom function
    customFuncs = customFuncs.map(f => f.id === func.id ? { ...f, ...func } as IAIFunction : f);
  } else if (!func.id) {
    // Creating a new custom function
    const newFunc: IAIFunction = {
      id: `func-custom-${Date.now()}`,
      name: func.name || 'Untitled Function',
      systemPrompt: func.systemPrompt || '',
      isCustom: true,
    };
    customFuncs.push(newFunc);
  } else {
    console.warn("Attempted to save a built-in function. This is not allowed.");
    return;
  }
  localStorage.setItem(CUSTOM_FUNCTIONS_STORAGE_KEY, JSON.stringify(customFuncs));
};

export const deleteFunction = async (functionId: string): Promise<void> => {
  const customFuncsJson = localStorage.getItem(CUSTOM_FUNCTIONS_STORAGE_KEY);
  let customFuncs: IAIFunction[] = customFuncsJson ? JSON.parse(customFuncsJson) : [];

  const initialLength = customFuncs.length;
  customFuncs = customFuncs.filter(f => f.id !== functionId);

  if (customFuncs.length < initialLength) {
    localStorage.setItem(CUSTOM_FUNCTIONS_STORAGE_KEY, JSON.stringify(customFuncs));
  } else {
    console.warn(`Attempted to delete non-existent or built-in function with ID: ${functionId}`);
  }
};


// --- Mock File System for Context ---

const getFileContent = async (path: string): Promise<string> => {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      return `[ERROR: Could not fetch content for ${path}. File not found or server error.]`;
    }
    return await response.text();
  } catch (error) {
    console.error(`Failed to fetch ${path}`, error);
    return `[ERROR: Failed to fetch ${path}. Check network connection.]`;
  }
}

export const readSingleContextSource = async (source: IContextSource): Promise<string> => {
  const subfolderNote = source.type === 'folder' && source.includeSubfolders ? ' (including all subfolders)' : '';
  const header = `--- Start of Context from ${source.type.toUpperCase()}: "${source.remark}" (${source.path})${subfolderNote} ---\n`;
  const footer = `--- End of Context from: "${source.remark}" ---\n`;
  let body = '';

  // Handle user-added paths (which are mocked)
  if (!source.path.startsWith('/contexts_sample')) {
    body = `(Note: This is simulated content for the user-added path: ${source.path})\n\n` +
      `This is mock content for the path "${source.path}". In a real desktop application, the actual content would be read here.`;
    return `${header}${body}\n${footer}`;
  }

  // Handle sample files and folders by simulating the file system
  if (source.type === 'file') {
    body = await getFileContent(source.path);
  } else { // folder
    const parentPathWithSlash = source.path.endsWith('/') ? source.path : `${source.path}/`;

    const filesToRead = MOCK_SAMPLE_FILES.filter(path => {
      if (source.excludedPaths?.includes(path)) return false;
      if (!path.startsWith(parentPathWithSlash)) {
        return false;
      }
      if (!source.includeSubfolders) {
        const remainingPath = path.substring(parentPathWithSlash.length);
        return !remainingPath.includes('/');
      }
      return true;
    });

    if (filesToRead.length === 0) {
      body = `(Folder is empty or no matching sample files found for: ${source.path})`;
    } else {
      const fileContents = await Promise.all(
        filesToRead.map(async (filePath) => {
          const content = await getFileContent(filePath);
          return `--- File: ${filePath} ---\n${content}`;
        })
      );
      body = fileContents.join('\n\n');
    }
  }

  return `${header}${body}\n${footer}`;
}


export const readContextSources = async (sources: IContextSource[]): Promise<string> => {
  if (sources.length === 0) {
    return "";
  }
  const contentPromises = sources.map(source => readSingleContextSource(source));
  const allContent = await Promise.all(contentPromises);
  return allContent.join('\n\n');
};

export const getRawContextForInspection = async (source: IContextSource): Promise<string> => {
  // Handle mocked user-added paths
  if (!source.path.startsWith('/contexts_sample')) {
    let content = `(Note: This is simulated raw content for the user-added path: ${source.path})\n\n`;
    if (source.type === 'file') {
      content += `This is mock content for the file "${source.path}".`;
    } else {
      content += `This is mock content for the folder "${source.path}". When inspecting a folder, the content of all its files are concatenated.`;
    }
    return content;
  }

  if (source.type === 'file') {
    return await getFileContent(source.path);
  }

  // For folders, concatenate raw content of files with a minimal separator
  const parentPathWithSlash = source.path.endsWith('/') ? source.path : `${source.path}/`;
  const filesToRead = MOCK_SAMPLE_FILES.filter(path => {
    if (source.excludedPaths?.includes(path)) return false;
    if (!path.startsWith(parentPathWithSlash)) return false;
    if (!source.includeSubfolders) {
      const remainingPath = path.substring(parentPathWithSlash.length);
      return !remainingPath.includes('/');
    }
    return true;
  });

  if (filesToRead.length === 0) {
    return `(This folder is empty or no matching sample files were found.)`;
  }

  const fileContents = await Promise.all(
    filesToRead.map(async (filePath) => {
      const fileName = filePath.split('/').pop();
      const content = await getFileContent(filePath);
      return `--- ${fileName} ---\n${content}`;
    })
  );
  return fileContents.join('\n\n');
};

export const expandFolderSource = async (source: IContextSource): Promise<IContextSource[]> => {
  if (source.type !== 'folder') return [source];

  // For non-sample paths in web mode, we can only provide a mock expansion.
  if (!source.path.startsWith('/contexts_sample')) {
    return [{
      id: `ctx-mock-${source.remark.replace(/\s/g, '')}`,
      path: `${source.path}/mock-file.md`,
      remark: `mock-file.md from ${source.remark}`,
      type: 'file',
      isHidden: source.isHidden,
      includeSubfolders: false
    }];
  }

  const parentPathWithSlash = source.path.endsWith('/') ? source.path : `${source.path}/`;

  const filesToRead = MOCK_SAMPLE_FILES.filter(path => {
    if (source.excludedPaths?.includes(path)) return false;
    if (!path.startsWith(parentPathWithSlash)) return false;
    if (!source.includeSubfolders) {
      const remainingPath = path.substring(parentPathWithSlash.length);
      return !remainingPath.includes('/');
    }
    return true;
  });

  return filesToRead.map(filePath => {
    const fileName = filePath.split('/').pop() || '';
    const remark = fileName.includes('.') ? fileName.split('.').slice(0, -1).join('.') : fileName;
    const isHiddenOverride = source.overrideHidden?.[filePath];

    return {
      id: `ctx-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
      path: filePath,
      remark: remark,
      type: 'file',
      isHidden: typeof isHiddenOverride === 'boolean' ? isHiddenOverride : source.isHidden,
      includeSubfolders: false,
    };
  });
};


// --- Profile & Session Management ---

export const saveProfile = async (settings: any): Promise<void> => {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(settings));
};

export const loadProfile = async (): Promise<any | null> => {
  const profileJson = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (profileJson) {
    const profile = JSON.parse(profileJson);
    // Migrate old profiles to ensure new settings exist
    if (!profile.settings.ollamaApiUrl) {
      profile.settings.ollamaApiUrl = DEFAULT_SETTINGS.ollamaApiUrl;
    }
    if (!('openaiApiKey' in profile.settings)) {
      profile.settings.openaiApiKey = '';
    }
    if (!('customApiUrl' in profile.settings)) {
      profile.settings.customApiUrl = '';
    }
    if (!('customApiKey' in profile.settings)) {
      profile.settings.customApiKey = '';
    }
    return profile;
  }
  // If no profile is found in storage, return null. App.tsx will handle creating the default.
  return null;
};

export const saveSession = async (session: any): Promise<void> => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const loadSession = async (): Promise<any | null> => {
  const session = localStorage.getItem(SESSION_STORAGE_KEY);
  return session ? JSON.parse(session) : null;
};

export const clearSession = async (): Promise<void> => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}