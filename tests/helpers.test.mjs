import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { waitForTask, readDocument, PluginError } from '../index.mjs';

test('task waiting preserves terminal error codes and never replays or cancels', async () => {
  let calls = 0;
  const task = await waitForTask({ get: async id => ({ id, state: ++calls === 1 ? 'running' : 'completed', result: 42 }) }, 'one', { pollIntervalMs: 1 });
  assert.equal(task.result, 42);
  await assert.rejects(waitForTask({ get: async id => ({ id, state: 'uncertain', error: 'verify', errorCode: 'DISCONNECTED' }) }, 'one'), e => e instanceof PluginError && e.code === 'DISCONNECTED' && e.details.state === 'uncertain');
  await assert.rejects(waitForTask({ get: async () => ({ id: 'other', state: 'completed' }) }, 'one'), { code: 'INVALID_RESULT' });
});

test('task deadline also bounds an unresponsive get; pre-abort makes no call', async () => {
  await assert.rejects(waitForTask({ get: () => new Promise(() => {}) }, 'one', { timeoutMs: 10 }), { code: 'TIMEOUT' });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(waitForTask({ get: () => { throw Error('must not call'); } }, 'one', { signal: controller.signal }), { code: 'CANCELLED' });
});

test('document export follows UTF-8 offsets and verifies one immutable hash', async () => {
  const content = '猫😀\n中文';
  const hash = createHash('sha256').update(content).digest('hex');
  const offsets = [];
  const result = await readDocument({ export: async ({ offset, exportId }) => {
    offsets.push(offset);
    const chunk = offset === 0 ? '猫😀' : '\n中文';
    if (offset) assert.equal(exportId, 'snapshot');
    return { exportId: 'snapshot', format: 'markdown', formatVersion: 1, chunk, offset, nextOffset: offset + Buffer.byteLength(chunk), totalBytes: Buffer.byteLength(content), hash, revision: '1', draftHash: 'source', dirty: true };
  } }, {});
  assert.deepEqual(offsets, [0, 7]);
  assert.equal(result.content, content);
  assert.equal(result.dirty, true);
});

test('document export rejects stalled, oversized, or corrupted data', async () => {
  const part = { exportId: 's', format: 'markdown', formatVersion: 1, chunk: '', offset: 0, nextOffset: 0, totalBytes: 1, hash: '0'.repeat(64), revision: '1', draftHash: 'draft', dirty: false };
  for (const value of [part, { ...part, totalBytes: 33 << 20 }, { ...part, chunk: 'x', nextOffset: 1 }]) {
    await assert.rejects(readDocument({ export: async () => value }, {}), { code: 'INVALID_RESULT' });
  }
});
