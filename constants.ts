import { ISettings, ISession } from './types';

export const APP_NAME = "EpiTelos";

export const GEMINI_MODELS = ['gemini-2.5-flash'];
export const OPENAI_MODELS = ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
export const OLLAMA_MODEL_EXAMPLES = 'e.g., llama3, mistral, phi3';

// Adapt to different environments: Vite uses import.meta.env, Tauri/Node use process.env
const apiKey = typeof process !== 'undefined' && process.env?.API_KEY
  ? process.env.API_KEY
  : import.meta.env?.VITE_API_KEY;

export const DEFAULT_SETTINGS: ISettings = {
  apiKey: apiKey || '',
  modelSource: 'Ollama',
  preferredModel: '', // Set to empty to allow auto-selection of first available Ollama model
  ollamaApiUrl: 'http://localhost:11434',
  openaiApiKey: '',
  customApiUrl: '',
  customApiKey: '',
  defaultFunctionId: null,
  defaultContextIds: [],
};

export const EMPTY_SESSION: ISession = {
  lastFunctionId: null,
  lastModel: null,
  lastContextIds: [],
  lastUserInput: '',
  timestamp: null,
};

export const PROFILE_STORAGE_KEY = 'epitelos_profile';
export const SESSION_STORAGE_KEY = 'epitelos_session';