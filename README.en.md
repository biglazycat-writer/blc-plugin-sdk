# 大懒猫创作平台 Plugin SDK v1

[简体中文](README.md) | **English**

[blc-plugin-sdk](https://www.npmjs.com/package/blc-plugin-sdk) is the official plugin SDK for **大懒猫创作平台**. This source tree is the **1.3.0 candidate, not yet published to npm**, using public **API 1**. Markdown document export requires revision 1; appearance, page readiness and user-entry declarations require revision 2; document navigation requires revision 3.

Before publication, validate this repository and run `npm pack`, copy the resulting artifact into the plugin project's `vendor/` directory, then install it:

```bash
npm install --save-exact ./vendor/blc-plugin-sdk-1.3.0.tgz
```

The package provides TypeScript declarations, a manifest schema, entry points and helper functions. Platform capabilities are implemented by the host bridge. This repository is the authoritative SDK source; the host carries a verified physical artifact. Projects generated through MCP can include their own offline SDK copy. Builds do not import another repository's source files.

## Runtime and execution model

The desktop installer does not bundle Node/npm. Users select a local installation in **System Settings → Runtime**, or download a dedicated runtime whose SHA-256 is verified. Supported local versions are Node `>=22.23.3 <23.0.0` and npm `>=10.9.9 <11.0.0`; the dedicated download remains pinned to Node 22.23.3 / npm 10.9.9. Each plugin's `engines.node` is also checked against the selected runtime. Exact plugin constraints are respected. Stop plugin processes and tasks before changing runtimes.

Plugin backends run in separate Node processes. JavaScript, compiled TypeScript, ESM/CJS, dynamic imports and ordinary npm packages are supported. Native modules must match the OS, architecture and Node ABI. TypeScript is compiled by the project's build toolchain; Node type stripping is not a substitute for the build step. Plugins are trusted local programs with normal filesystem, network and subprocess access. Process isolation is not a security sandbox.

Browser views load `blc-plugin-sdk/browser`. They may use ordinary web frameworks, but must not import Node-only modules. The bridge is available only inside a host plugin view. Closing a view releases its bridge and renderer, while backend tasks continue.

## Minimal project

Create a regular npm project, or use the host's `plugin_project_create` MCP tool in an empty directory. The host does not include a source-code editor. The `biglazycat` field in `package.json` is the only plugin manifest; see [manifest.schema.json](manifest.schema.json) and [index.d.ts](index.d.ts) for the complete contract.

```json
{
  "name": "my-plugin",
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=22.23.3 <23.0.0" },
  "dependencies": { "blc-plugin-sdk": "file:vendor/blc-plugin-sdk-1.3.0.tgz" },
  "devDependencies": { "typescript": "5.9.3", "@types/node": "22.19.0" },
  "scripts": { "typecheck": "tsc --noEmit", "build": "tsc" },
  "biglazycat": {
    "apiVersion": 1,
    "displayName": "My plugin",
    "main": "dist/main.js",
    "platforms": ["windows/amd64", "darwin/amd64", "darwin/arm64", "linux/amd64"],
    "contributes": {
      "commands": [{ "id": "hello", "title": "Run example", "aiCallable": true }]
    }
  }
}
```

Include the verified SDK tgz with this example's source and installation package. Commit source, scripts, tests and `package-lock.json`; exclude `node_modules` and build output. Host preparation uses `npm ci`. Use `npm install` or `plugin_project_run(script:"install")` to update the lockfile. Offline MCP projects use `install-links=true` to install their local SDK directory copy as physical files.

```ts
import { definePlugin } from 'blc-plugin-sdk'

export default definePlugin(ctx => {
  ctx.commands.register('hello', async (_args, invocation) => {
    invocation.signal.throwIfAborted()
    await invocation.progress(0.5, 'Working')
    return { message: 'Hello from 大懒猫创作平台!' }
  })
  return async () => { /* Release connections and listeners. */ }
})
```

Register every declared command and service during activation, not on the first call. Registration IDs must match the manifest. Page-only plugins may omit `main`; backend-only plugins do not need a view. JSX/TSX, aliases and bundling follow the project's chosen toolchain.

## Tasks, cancellation and errors

Invoking a command returns a host-owned task. Use `invocation.signal` for cooperative cancellation and `invocation.progress()` for progress reporting. In a browser view:

```ts
import { connect } from 'blc-plugin-sdk/browser'
import { waitForTask } from 'blc-plugin-sdk'

const sdk = await connect()
const started = await sdk.commands.invoke('hello')
const finished = await waitForTask(sdk.tasks, started.id, { timeoutMs: 30000 })
console.log(finished.result)
```

`waitForTask` defaults to a 30-second timeout and a 150 ms polling interval; it also accepts an `AbortSignal`. Cancellation and timeout end only the local wait. They do not cancel or resubmit the remote task. Query the existing task ID, or explicitly call `tasks.cancel`. An `uncertain` external outcome must be reconciled before retrying.

`tasks.get(id)` retrieves one task's state and full result, limited to the calling plugin's tasks. Task lists and diagnostics return summaries with `hasResult`, avoiding large historical results in control messages. Individual command results must fit within the 1 MiB message limit. Large data must use a chunked protocol.

`PluginError.code` is machine-readable. Errors include `API_MISMATCH`, `API_REVISION_UNSUPPORTED`, `NODE_MISMATCH`, `BACKPRESSURE`, `STALE_GENERATION`, `WORKSPACE_CHANGED`, `DRAFT_CONFLICT`, `RESOURCE_CHANGED`, `DIRTY_VIEW`, `SAVE_TIMEOUT` and `OPERATION_CONFLICT`. Oversized responses return `MESSAGE_TOO_LARGE`; unserializable results return `RESULT_NOT_SERIALIZABLE`. A normal response failure does not terminate a healthy plugin process.

## Views, state and saving

Each `contributes.views` entry declares `id`, `title`, `entry` and `defaultLocation`. `entry` points to built HTML, for example from Vite, React or Vue. `connect()` from `blc-plugin-sdk/browser` is asynchronous; the host's direct `./__sdk.mjs` bridge exposes synchronous `connect()`.

```ts
const view = await sdk.context()
let draft = view.state ?? { text: '' }

async function edited(text: string) {
  draft = { text }
  await sdk.setState(draft, true)
}

sdk.onSave(async () => {
  await persistDraft(draft) // Your own persistence function; throw on failure.
  await sdk.setState(draft, false)
})
```

State is a small JSON recovery checkpoint, limited to 64 KiB. Do not use it as a document database or secret store. The host associates state with plugin, view, instance, workspace and resource identity. State writes retain one in-flight request and the newest pending snapshot; save acknowledgement waits for committed state. The backend's `views.close(instanceId)` rejects dirty views; the host shell handles the user's save/discard decision.

The bridge allows at most 32 in-flight SDK requests per browser, with 16 concurrent handlers per view on the host. Report bridge failures instead of blindly replaying writes. `view.theme` provides CSS variables and live theme updates. Views cannot call arbitrary Wails methods. Use `sdk.ui.openExternal(url)` to open HTTP(S) links in the system browser.

## Markdown export and document editing

Declare `"minimumApiRevision": 1` inside `biglazycat` when using document export:

```ts
import { readDocument } from 'blc-plugin-sdk'

const document = await readDocument(ctx.documents, {
  workspaceId, workspaceSession, documentId, editorId, windowId,
}, { timeoutMs: 30000, signal })
// document.content is Markdown v1; no host Tiptap parser is needed.
```

`documents.export` captures one immutable Markdown snapshot with `exportId`, `revision`, `draftHash`, `dirty` and SHA-256. `offset`, `nextOffset` and `totalBytes` are UTF-8 byte counts. Chunks preserve character boundaries and are limited to 96 KiB; the document limit is 32 MiB. Up to four snapshots per plugin and 64 MiB across the host are retained. Snapshots expire after two minutes and are released after the last chunk. Continuations must use the same plugin, workspace session, document and editor identity. `readDocument` handles chunking, deadlines and integrity validation.

For in-place editing, first call `documents.snapshot({workspaceId,workspaceSession,documentId,editorId,windowId})`, then pass the returned `revision` and `draftHash`, new content and a unique `operationId` to `documents.apply`. Conflicting drafts, persisted revisions, editors or workspace changes reject the write. The host uses the target editor's transaction and save flow. Direct Node filesystem writes bypass these guarantees.

Snapshots retain the existing `markdown` / `tiptap` formats and expose `formatVersion: 1`. Raw Tiptap snapshots are a low-level editing interface, not a promise of lossless interchange for every future editor node. Use Markdown export for reading and publishing. Preserve unknown rich-text nodes when editing and do not overwrite a whole document with a partial parse. The host rejects invalid rich-text writes.

`documents.operation(operationId)` retrieves the recorded outcome. Reusing an ID with identical normalized parameters returns the existing operation; different parameters are rejected. Unconfirmed operations after a crash become `uncertain`. Journal failures do not report confirmed completion. The journal currently allows 10,000 receipts and rejects new operations at the limit; no automatic receipt deletion or product archive UI is provided. Do not delete receipts and replay historical operations.

## Workspace files and images

`workspace.list()` returns `WorkspaceRecord[]`; resource listing/search returns `ResourcePage`. API 1 preserves published resource key casing such as `Rel`, `Name` and `Kind`. Internal model changes must not silently change public fields.

For custom UTF-8 files, use `workspace.read` and the complete file's hash before writing:

```ts
await sdk.workspace.import({
  workspaceId, workspaceSession, path: 'notes/example.catnote',
  expectedHash: loadedHash, content: nextText, operationId: crypto.randomUUID(),
})
```

Omitting `expectedHash` creates a new file; it must not overwrite an existing one. Existing core documents are edited through `documents.apply`. Resource writes are limited to 700 KiB. Text reads return at most 512 KiB per call and accept files up to 16 MiB. For larger or binary files, use Node APIs and provide your own concurrency handling.

`images.list({query,offset,limit})` returns up to 100 images per page, including `id/name/src/width/height` and `total`. `images.read({src,offset,limit,hash})` returns data-URL chunks, at most 384 KiB each and 28 MiB in total. Pass the first chunk's hash on subsequent reads; changed images return `RESOURCE_CHANGED`. Browser calls inherit the view's workspace identity; backend calls supply `workspaceId/workspaceSession`. Reads are rejected after the workspace changes.

## Services, events and schedules

Declare plugin service dependencies in `biglazycat.dependencies`, separate from npm dependencies, with `plugin/service/version/optional`. Missing required services, incompatible versions and cycles prevent activation. Optional dependencies do not silently start an incompatible version.

`ctx.services.provide('text', { transform })` registers declared methods. `ctx.services.call(plugin, service, method, args, invocation)` propagates the invocation chain. Service calls have a 20-second timeout and maximum depth of eight; cycles are rejected. The host's `export.text` v1 provider contract calls `transform({text, format:'markdown', filename}, invocation)` and expects `{text}`. It is used only after the user selects a provider; failures do not silently switch implementations.

Subscribe to `startup`, `workspace.opened`, `document.committed` and `plugin:<package>:<event>`. `events.emit(name,payload)` adds the plugin namespace. Workspace restoration also emits an open event. Events cover integrated commit paths, not arbitrary Node writes. Notifications are not durable or exactly-once; a full queue drops events with their IDs logged. Re-read domain state and persist your own checkpoints with `storage`.

Schedules declare `id/command/intervalSeconds/catchUp` under `contributes.schedules`. Checkpoints survive host restarts. Beyond the interval and five-second grace period, `skip` skips a missed run and `once` catches up at most once. An unfinished command is not started again. Checkpoints are saved before scheduling; persistence failure prevents execution. A crash between those steps can skip a run. No system daemon or exactly-once delivery is implied.

## Host tools, limits and recovery

Host tools include `plugins_list`, `plugin_diagnostics`, `plugin_task`, `plugin_cancel`, `plugin_enable`, `plugin_open_view`, `plugin_sdk`, `plugin_project_create/files/read/write/run`, `plugin_install` and `plugin_invoke`. Existing AI sessions use host approval and call identities; plugins cannot inject a model-selected workspace context. Repeated call IDs return their recorded outcome without replaying unconfirmed effects.

Current limits are 16 backend processes, 32 views, 128 unfinished command tasks and eight installation/development preparation tasks. Preparation scripts execute serially, with cancellable queues. Storage values are limited to 64 KiB; logs retain up to 500 entries / 256 KiB per plugin. The default V8 heap is 256 MiB, with process-tree thresholds of 512 MiB and 25% machine CPU. Windows applies Job Object quotas; macOS/Linux sample every second and stop a process after ten consecutive CPU-limit violations. Sampling and V8 limits are not universal hard memory caps.

An already-running backend that exits abnormally may reactivate after two and four seconds, at most twice. Commands, events and external operations are not replayed. Crash counts survive application restarts; explicit enable/restart is required after the limit. First activation, version-switch and required-dependency failures remain faulted until addressed. Commands have no universal short total duration; heartbeats check event-loop responsiveness. Forced cancellation can interrupt other tasks in the same instance. Views can recover their committed checkpoints after reload.

## External MCP and development mode

Enable the MCP service and plugin-development tools in System Settings. External tools connect through the application's `--mcp-stdio`; read `plugin_sdk` and `get_app_guide(section:"plugins")` first. `plugin_project_create` writes an independent project and SDK artifact to an empty directory; edit its source with your external tools.

Use `plugin_project_run` for `lock/install/typecheck/build/test`. Writes require a unique `requestId`; installation and script execution also require `trusted:true`. Query `plugin_task` for completion. For a built local project:

```json
{
  "source": { "kind": "directory", "location": "D:\\my-plugin" },
  "development": true,
  "prepare": false,
  "trusted": true,
  "requestId": "unique-request-id"
}
```

Pass this to `plugin_install`, then use `plugin_enable` and `plugin_open_view`. Development mode checks source changes every second and waits for two stable samples before typechecking/building in isolation. It ignores `dist`, `node_modules`, `.git`, `.cache` and coverage output. Failed builds preserve the last working artifact. Dirty views and unfinished tasks delay replacement. Install dependencies in the source project first. Disabling stops automatic refresh; uninstalling preserves source.

Keep credentials in backend `credentials`, never in source, manifests, logs or view state. Windows uses user-bound DPAPI; other platforms require a configured system credential service.

## API evolution, development and release

SDK 1.3.0 keeps API major version 1. The host rejects a plugin whose `minimumApiRevision` exceeds its capabilities. SDK package versions, API major/revision, RPC wire format and installation-index format evolve separately. Existing API 1 fields, meanings and error codes are maintained across ordinary upgrades.

Recommended view build targets are ES2022, Chromium 109 / Safari 16.4 and equivalent WebKit. Final platform support depends on native host acceptance tests; a Node version does not specify a browser engine.

```bash
npm ci
npm test                 # JavaScript tests and strict TypeScript consumer checks
npm pack --dry-run       # Inspect package contents, including both README languages
```

GitHub Actions tests pushes and pull requests on Node 22.23.3 and Node 22.x. Publishing a GitHub Release or manually dispatching the publishing workflow runs tests and package checks, verifies a release tag against `package.json`, then publishes to npm. Published versions cannot be overwritten. Host releases must also test frozen older SDK/plugin artifacts; SDK tests alone do not validate every native UI platform.

## API 1 revision 2: user entries and appearance

Declare `minimumApiRevision: 2` when using these additions. Commands with `visibility: "internal"` have no command-palette, keyboard-shortcut or toolbar entry, while views can still invoke them. `aiCallable` controls AI access independently. Omitted visibility stays public. A view can declare `commandPalette: false` to avoid duplicating its opening command.

`sdk.appearance.getColorScheme()` synchronously returns the host's resolved `light` or `dark` mode. `sdk.appearance.onDidChangeColorScheme(listener)` subscribes and returns an unsubscribe function. The host sets `data-color-scheme` and CSS `color-scheme` before loading the page and updates them through the bridge. System mode follows the operating system; theme packages are independent of this API.

Call `await sdk.ready()` after committing the first usable UI, including an error screen. Do not wait for `requestAnimationFrame`: hidden native containers can suspend animation frames. `ViewSession.timings` and diagnostics record container, loaded, bridge and ui milliseconds since mount, separating native startup, resource loading and plugin initialization.

## License

[MIT](LICENSE). See [CHANGELOG.md](CHANGELOG.md) for release history.

## API 1 revision 3: plugin-owned pages and document navigation

Plugins render their full page, including titles, back buttons and refresh controls. The host provides the container, capabilities and save protocol. Manifest titles still name application tabs and windows. There is no fixed toolbar inside a healthy view; host error recovery remains available when a page fails.

Declare `minimumApiRevision: 3` for `sdk.ui.openDocument({ workspaceId, workspaceSession, documentId })`. It focuses an existing creation-document tab in the main window or reopens it if closed. No editorId is required. Collection documents open their chapter; standalone documents open their own tab.

Browser navigation is bound to the view's captured workspace session while documentId remains plugin-selected. Node callers provide the workspace and session explicitly. Switched or reopened sessions are rejected, and expired requests cannot commit late. The Promise waits for save coordination and main-window confirmation. Errors include NAVIGATION_CANCELLED, NAVIGATION_TIMEOUT and WORKSPACE_CHANGED.

The plugin decides whether to save its own draft before navigating. A publishing plugin can show a back button only when its original-document context is complete, persist its draft first and keep the page open on failure. Other plugins are free to omit that button.
