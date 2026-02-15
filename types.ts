
export enum View {
  Runner = 'RUNNER',
  Context = 'CONTEXT',
  FunctionManager = 'FUNCTION_MANAGER',
  History = 'HISTORY',
  Settings = 'SETTINGS',
}

export interface IAIFunction {
  id: string;
  name: string;
  systemPrompt: string;
  description?: string;
  category?: string;
  isCustom?: boolean;
}

export interface IContextSource {
  id: string;
  path: string;
  remark: string;
  type: 'folder' | 'file';
  includeSubfolders?: boolean;
  isHidden?: boolean;
  isFolderMarker?: boolean; // Used to identify a folder source in the display list
  isUserAdded?: boolean; // Identifies a source that was directly added by the user.
  // New properties for granular control within folders
  excludedPaths?: string[];
  overrideHidden?: { [path: string]: boolean };
}

export interface TreeNode {
  id: string; // Represents the full path to this node
  name: string; // The display name (the last part of the path)
  children: TreeNode[];
  source?: IContextSource; // The actual context source if this node represents one
}


export interface ISettings {
  apiKey: string; // Gemini API Key from env (deprecated)
  modelSource: 'Gemini' | 'Ollama' | 'OpenAI' | 'Custom' | 'Maritaca';
  preferredModel: string;
  geminiModel?: string;
  ollamaModel?: string;
  openaiModel?: string;
  maritacaModel?: string;
  customModel?: string;
  ollamaApiUrl?: string;
  openaiApiKey?: string;
  geminiApiKey?: string;
  maritacaApiKey?: string;
  maritacaApiUrl?: string;
  customApiUrl?: string;
  customApiKey?: string;
  defaultFunctionId: string | null;
  defaultContextIds: string[];
  notificationEnabled?: boolean;
  sidebarCollapsed?: boolean;
}

export interface ISession {
  lastFunctionId: string | null;
  lastModel: string | null;
  lastContextIds: string[];
  lastUserInput: string;
  timestamp: number | null;
  isStreaming?: boolean;
  showReasoning?: boolean;
}

export interface IArchive {
  id: string;
  title: string;
  functionId: string;
  model: string;
  contextIds: string[];
  contextNames?: string[]; // Optional: store readable names
  userInput: string;
  assistantResponse: string;
  reasoningBlock?: string;
  timestamp: number;
}

export type VerificationStatus = {
  type: 'success' | 'error' | 'verifying';
  message: string;
};
