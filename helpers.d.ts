import type { DocumentTarget, DocumentExportChunk, Task, Json } from './index.js';
export class PluginError extends Error {
  readonly code: string;
  readonly details?: Json;
  constructor(code: string, message: string, details?: Json);
}
export interface WaitOptions { signal?: AbortSignal; timeoutMs?: number }
export interface TaskWaitOptions extends WaitOptions { pollIntervalMs?: number }
export function waitForTask(tasks: { get(id: string): Promise<Task> }, id: string, options?: TaskWaitOptions): Promise<Task>;
export type ExportedDocument = { content: string; format: 'markdown'; formatVersion: 1; revision: string; draftHash: string; dirty: boolean; hash: string };
export function readDocument(documents: { export(request: DocumentTarget & { exportId?: string; offset?: number; limit?: number }): Promise<DocumentExportChunk> }, target: DocumentTarget, options?: WaitOptions): Promise<ExportedDocument>;
