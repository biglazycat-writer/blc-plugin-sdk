import { definePlugin, readDocument, waitForTask, PluginError, type Json } from 'blc-plugin-sdk';
import type { BrowserAPI } from 'blc-plugin-sdk/browser';
import type {OCRProviderService, OCRProviderServiceV2, OCRDocument, TranslationProviderService, SpeechProviderService, ProviderContribution} from 'blc-plugin-sdk';

declare const ocr: OCRProviderService;
declare const speech: SpeechProviderService;
declare const invocation: import('blc-plugin-sdk').Invocation;
const contribution: ProviderContribution = {id: 'local', contract: 'ocr', version: 1, service: 'engine'};
const started = await ocr.start({transferId: 'image', format: 'markdown'}, invocation);
const resultChunk = await ocr.result({jobId: started.jobId, offset: 0, limit: 65536}, invocation);
const synthesized = await speech.synthesize({text: 'Hello', speed: 1}, invocation);
const audioChunk = await speech.read({audioId: synthesized.audioId, offset: 0, limit: 65536}, invocation);
const byteOffset: number = audioChunk.nextOffset;
void contribution; void resultChunk; void byteOffset;

declare const structuredOCR: OCRProviderServiceV2;
declare const translator: TranslationProviderService;
const structuredContribution: ProviderContribution = {id:'layout',contract:'ocr',version:2,service:'engine'};
const translationContribution: ProviderContribution = {id:'translator',contract:'text.translate',version:1,service:'translation'};
// @ts-expect-error version 2 只对 ocr 合同有效（与 manifest.schema.json 一致）。
const invalidContribution: ProviderContribution = {id:'voice',contract:'speech.tts',version:2,service:'speech'};
const document: OCRDocument = {schemaVersion:1,pages:[{width:1000,height:2000,coordinateSpace:'normalized',blocks:[{id:'line-1',type:'line',readingOrder:0,geometrySource:'detected',bbox:{x:.1,y:.1,width:.8,height:.05},text:'Hello'}]}]};
await structuredOCR.capabilities({}, invocation);
await structuredOCR.start({transferId:'page',source:'pdf',requirements:{geometry:'line'}},invocation);
const translation = await translator.translate({segments:[{id:'line-1',text:'Hello'}],sourceLanguage:'en',targetLanguage:'zh'},invocation);
const translatedText: string = translation.segments[0].text;
// @ts-expect-error OCR v2 returns a document, so output format belongs to the host.
await structuredOCR.start({transferId:'page',format:'markdown'},invocation);
void structuredContribution; void translationContribution; void invalidContribution; void document; void translatedText;

definePlugin(async ctx => {
  const models = await ctx.ai.models();
  const generation = await ctx.ai.generate({prompt:'处理输入文本',modelId:models[0]?.id,maxTokens:4096},{signal:invocation.signal});
  const generatedText: string = generation.text;
  void generatedText;
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
