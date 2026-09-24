export type LocalBackend = 'auto' | 'cpu' | 'cuda' | 'vulkan';
export type LocalStatus = { backend: string; model: string };

type LocalTauri = {
  invoke<T = unknown>(command: string, args?: Record<string, unknown>): Promise<T>;
  event: { listen(name: string, callback: (event: { payload: any }) => void): Promise<() => void> };
};

const api = (): LocalTauri => {
  if (!window.__TAURI__) throw new Error('Local GGUF models require the Windows desktop app.');
  return window.__TAURI__ as unknown as LocalTauri;
};

const call = async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
  try { return await api().invoke<T>(command, args); }
  catch (error) { throw error instanceof Error ? error : new Error(String(error)); }
};

export const validateModel = (path: string): Promise<string> => call('validate_model', { path });
export const startModel = (path: string, backend: LocalBackend): Promise<LocalStatus> => call('start_model', { path, backend });
export const stopModel = (): Promise<void> => call('stop_model');

type RunOptions = { systemPrompt: string; userPrompt: string; signal?: AbortSignal };

export async function runLocalFunction(options: RunOptions): Promise<string> {
  let response = '';
  for await (const chunk of runLocalFunctionStream(options)) response += chunk;
  return response;
}

export async function* runLocalFunctionStream({ systemPrompt, userPrompt, signal }: RunOptions): AsyncGenerator<string> {
  const tauri = api();
  const id = crypto.randomUUID();
  const queue: string[] = [];
  let finished = false;
  let failure: string | null = null;
  let wake: (() => void) | null = null;
  const unlisten = await tauri.event.listen('local-gguf-chunk', (event: { payload: { id: string; chunk?: string; error?: string; done: boolean } }) => {
    if (event.payload.id !== id) return;
    if (event.payload.chunk) queue.push(event.payload.chunk);
    if (event.payload.error) failure = event.payload.error;
    if (event.payload.done) finished = true;
    wake?.();
  });
  const abort = () => { void tauri.invoke('stop_request', { id }); wake?.(); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    await call('run_model', { input: { id, system_prompt: systemPrompt, user_prompt: userPrompt } });
    while (!finished || queue.length) {
      if (signal?.aborted) return;
      if (queue.length) { yield queue.shift()!; continue; }
      await new Promise<void>(resolve => { wake = resolve; });
      wake = null;
    }
    if (failure) throw new Error(failure);
  } finally {
    signal?.removeEventListener('abort', abort);
    unlisten();
    await tauri.invoke('stop_request', { id });
  }
}
