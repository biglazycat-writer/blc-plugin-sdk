export class PluginError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'PluginError';
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

function abortable(promise, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
    if (signal.aborted) abort();
  });
}

async function bounded(options, run) {
  const timeout = options.timeoutMs ?? 30000;
  if (!Number.isFinite(timeout) || timeout <= 0 || timeout > 2147483647) throw new TypeError('timeoutMs must be a positive bounded duration');
  const controller = new AbortController();
  const abort = () => controller.abort(new PluginError('CANCELLED', '等待已取消；后台任务不会自动重放或取消'));
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) abort();
  const timer = setTimeout(() => controller.abort(new PluginError('TIMEOUT', '等待超时；请查询现有任务或操作结果')), timeout);
  try {
    controller.signal.throwIfAborted();
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}

/** Wait only. Cancellation/timeout never resubmits or cancels a remote task. */
export function waitForTask(tasks, id, options = {}) {
  const interval = options.pollIntervalMs ?? 150;
  if (!Number.isFinite(interval) || interval < 1 || interval > 60000) throw new TypeError('Invalid pollIntervalMs');
  return bounded(options, async signal => {
    for (;;) {
      signal.throwIfAborted();
      const task = await abortable(tasks.get(id), signal);
      if (!task || task.id !== id) throw new PluginError('INVALID_RESULT', '任务身份不匹配');
      if (task.state === 'completed') return task;
      if (['failed', 'cancelled', 'interrupted', 'uncertain'].includes(task.state)) {
        throw new PluginError(task.errorCode ?? `TASK_${task.state.toUpperCase()}`, task.error ?? task.state, { taskId: id, state: task.state });
      }
      if (!['waiting', 'running', 'cancelling'].includes(task.state)) throw new PluginError('INVALID_RESULT', '未知任务状态');
      let timer;
      try { await abortable(new Promise(resolve => { timer = setTimeout(resolve, interval); }), signal); }
      finally { clearTimeout(timer); }
    }
  });
}

/** Read one immutable Markdown v1 export, with bounded UTF-8 chunks and hash. */
export function readDocument(documents, target, options = {}) {
  if (typeof documents.export !== 'function') throw new PluginError('API_REVISION_UNSUPPORTED', '文档导出需要 API 1 修订 1');
  return bounded(options, async signal => {
    const chunks = [];
    let first, offset = 0;
    for (;;) {
      signal.throwIfAborted();
      const part = await abortable(documents.export({ ...target, exportId: first?.exportId, offset }), signal);
      if (!part || part.format !== 'markdown' || part.formatVersion !== 1 || typeof part.chunk !== 'string' || typeof part.exportId !== 'string' || !part.exportId || typeof part.revision !== 'string' || typeof part.draftHash !== 'string' || typeof part.dirty !== 'boolean' || !/^[a-f0-9]{64}$/.test(part.hash ?? '') || !Number.isSafeInteger(part.totalBytes) || part.totalBytes < 0 || part.totalBytes > 32 * 1024 * 1024 || part.offset !== offset || part.nextOffset !== offset + new TextEncoder().encode(part.chunk).length || part.nextOffset > part.totalBytes || part.nextOffset === offset && offset < part.totalBytes) {
        throw new PluginError('INVALID_RESULT', '无效的文档导出分块');
      }
      first ??= part;
      if (part.exportId !== first.exportId || part.hash !== first.hash || part.totalBytes !== first.totalBytes || part.revision !== first.revision || part.draftHash !== first.draftHash || part.dirty !== first.dirty) throw new PluginError('RESOURCE_CHANGED', '导出快照在读取期间变化');
      chunks.push(part.chunk);
      offset = part.nextOffset;
      if (offset === part.totalBytes) {
        const content = chunks.join('');
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
        const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
        if (hash !== first.hash) throw new PluginError('INVALID_RESULT', '导出内容校验失败');
        return { content, format: 'markdown', formatVersion: 1, revision: first.revision, draftHash: first.draftHash, dirty: first.dirty, hash };
      }
    }
  });
}
