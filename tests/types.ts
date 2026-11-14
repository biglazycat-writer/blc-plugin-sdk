import { definePlugin, readDocument, waitForTask, PluginError, type Json } from 'blc-plugin-sdk';
import type { BrowserAPI } from 'blc-plugin-sdk/browser';

definePlugin(async ctx => {
  const workspaces: Json = await ctx.workspace.list();
  ctx.commands.register('typed', (args: { name: string }) => ({ name: args.name, workspaces }));
  const page = await ctx.workspace.resources({ workspaceId: 'w', workspaceSession: 's' });
  const name: string | undefined = page.items[0]?.Name;
  const document = await readDocument(ctx.documents, { workspaceId: 'w', workspaceSession: 's', documentId: 'd', editorId: 'e' });
  const format: 'markdown' = document.format;
  const navigation: void = await ctx.ui.openDocument({ workspaceId: 'w', workspaceSession: 's', documentId: 'd' });
  void navigation;
  void name; void format;
});

declare const browser: BrowserAPI;
const task = await waitForTask(browser.tasks, 'task', { signal: new AbortController().signal });
const result: Json | undefined = task.result;
const error = new PluginError('DRAFT_CONFLICT', 'changed');
const code: string = error.code;
void result; void code;

const mode: 'light' | 'dark' = browser.appearance.getColorScheme();
const unsubscribe: () => void = browser.appearance.onDidChangeColorScheme(next => { const resolved: 'light' | 'dark' = next; void resolved; });
await browser.ready();
const opened: void = await browser.ui.openDocument({ workspaceId: 'w', workspaceSession: 's', documentId: 'd' });
// @ts-expect-error A document ID alone cannot identify a workspace session.
await browser.ui.openDocument({ documentId: 'd' });
void opened;
void mode; unsubscribe();
