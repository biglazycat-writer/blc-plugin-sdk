import type { SharedAPI, Json, Task, ViewSession, ColorScheme } from './index.js';
export interface BrowserAPI extends SharedAPI {
  readonly apiVersion: 1;
  readonly apiRevision: number;
  /** API 1 revision 2. Initial mode is available synchronously before the first render. */
  appearance: {
    getColorScheme(): ColorScheme;
    onDidChangeColorScheme(listener: (mode: ColorScheme) => void): () => void;
  };
  /** API 1 revision 2. Call after the first usable frame, including an error screen. */
  ready(): Promise<void>;
  onSave(handler: () => void | Promise<void>): () => void;
  context(): Promise<ViewSession>;
  setState(state: Json, dirty?: boolean): Promise<void>;
  commands: { invoke(command: string, args?: Json): Promise<Task> };
  tasks: { list(): Promise<Omit<Task, 'result'>[]>; get(id: string): Promise<Task>; cancel(id: string): Promise<void> };
}
export function connect(): Promise<BrowserAPI>;
