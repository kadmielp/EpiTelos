// This file is used for TypeScript type definitions for Vite's `import.meta.env`.
// By defining this interface, we provide static typing for our environment variables.
// This helps prevent typos and ensures we are accessing existing variables.

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  // Add other environment variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
