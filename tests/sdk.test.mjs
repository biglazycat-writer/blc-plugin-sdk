import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { apiVersion, apiRevision, definePlugin } from '../index.mjs';
import { connect } from '../browser.mjs';

test('standard plugin activation preserves cleanup', async () => {
  let called = 0;
  const plugin = definePlugin(ctx => { ctx.register(); return () => called++; });
  const dispose = await plugin.activate({ register: () => called++ });
  assert.equal(called, 1); dispose(); assert.equal(called, 2);
  assert.equal(apiVersion, 1);
  assert.equal(apiRevision, 8);
  assert.throws(() => definePlugin(null), TypeError);
});
test('browser entry refuses a host without the matching bridge', async () => {
  await assert.rejects(connect(), /API_MISMATCH|插件页面/);
});
test('manifest publishes only versioned extension points', async () => {
  const schema = JSON.parse(await readFile(new URL('../manifest.schema.json', import.meta.url)));
  assert.equal(schema.properties.apiVersion.const, apiVersion);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.contributes.additionalProperties, false);
  assert.deepEqual(schema.$defs.argumentSchema.required, ['type']);
  assert.deepEqual(Object.keys(schema.properties.contributes.properties).sort(), ['commands','editors','features','menus','providers','schedules','services','views']);
});

test('revision 2 describes internal commands and optional page entries', async () => {
  const schema = JSON.parse(await readFile(new URL('../manifest.schema.json', import.meta.url), 'utf8'));
  assert.deepEqual(schema.properties.contributes.properties.commands.items.properties.visibility.enum, ['public', 'internal']);
  assert.equal(schema.properties.contributes.properties.views.items.properties.commandPalette.default, true);
});

test('revision 4 declares OCR and speech provider contracts', async () => {
  const schema = JSON.parse(await readFile(new URL('../manifest.schema.json', import.meta.url), 'utf8'));
  assert.deepEqual(schema.properties.contributes.properties.providers.items.properties.contract.enum, ['export.text', 'ocr', 'speech.tts', 'text.translate']);
  assert.deepEqual(schema.properties.contributes.properties.providers.items.properties.version.enum, [1, 2]);
});

test('revision 7 lets plugins declare the exact feature actions and locations', async () => {
  const schema = JSON.parse(await readFile(new URL('../manifest.schema.json', import.meta.url), 'utf8'));
  const feature = schema.properties.contributes.properties.features.items;
  assert.deepEqual(feature.required, ['id', 'title', 'actions']);
  assert.deepEqual(Object.keys(feature.properties.actions.properties), ['toolbar', 'editor', 'resource', 'sidebar']);
  assert.equal(feature.properties.actions.additionalProperties, false);
  assert.deepEqual(feature.properties.actions.properties.toolbar.oneOf, [{required:['command']},{required:['view']},{required:['speech']}]);
  assert.equal(feature.properties.defaults.uniqueItems, true);
});

test('revision 8 declares the plugin icon in three forms', async () => {
  const schema = JSON.parse(await readFile(new URL('../manifest.schema.json', import.meta.url), 'utf8'));
  const icon = schema.properties.icon;
  assert.equal(icon.type, 'string');
  assert.equal(icon.maxLength, 200);
  assert.match(icon.description, /revision 8/);
  assert.match(icon.description, /minimumApiRevision: 8/);
  assert.match(icon.description, /256 KiB/);
});
