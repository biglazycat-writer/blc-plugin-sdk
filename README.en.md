# BigLazyCat Writer Plugin SDK (blc-plugin-sdk)

[简体中文](README.md) | **English**

The official plugin SDK for BigLazyCat Writer: type definitions, the manifest schema and the host bridge entries. Plugin backends and pages talk to the desktop app through it; actual platform capabilities are provided by the host bridge.

- Install: `npm install blc-plugin-sdk`
- Backend runtime: Node `>=22.23.3 <23.0.0`
- API major version 1, extended by revisions: revision 1 adds chunked document export, revision 2 adds color scheme, page readiness and user-entry declarations, revision 3 adds document navigation
- Revision 4 adds `OCRProviderService` and `SpeechProviderService` contracts with standard byte-chunk results; revision 5 adds general text generation; revision 6 adds structured OCR and the independent `text.translate` contract
- Revision 7 lets plugins decide which user-facing feature entries appear; revision 8 allows a plugin icon to be declared in the manifest
- License: [MIT](LICENSE)

## Quick start

The backend entry `blc-plugin-sdk` exports `definePlugin`:

```ts
import { definePlugin } from 'blc-plugin-sdk'

export default definePlugin(ctx => {
  ctx.commands.register('hello', async (_args, invocation) => {
    invocation.signal.throwIfAborted()
    return { message: 'Hello, BigLazyCat Writer!' }
  })
  return async () => { /* release connections, listeners, etc. */ }
})
```

The page entry `blc-plugin-sdk/browser` provides `connect()`:

```ts
import { connect } from 'blc-plugin-sdk/browser'
const sdk = await connect()
const view = await sdk.context()
```

The `biglazycat` field in `package.json` is the single plugin manifest; its fields are constrained by the bundled `manifest.schema.json`, and the authoritative signatures are `index.d.ts` and `browser.d.ts`. To start from scratch, use the official template [blc-plugin-template](https://github.com/biglazycat-writer/blc-plugin-template).

## Package contents

| Import | Purpose |
| --- | --- |
| `blc-plugin-sdk` | Backend entry: `definePlugin`, `readDocument`, `waitForTask`, `PluginError` and all type definitions |
| `blc-plugin-sdk/browser` | Page entry: `connect()` and the `BrowserAPI` types |
| `blc-plugin-sdk/manifest.schema.json` | JSON Schema for the `biglazycat` manifest (draft 2020-12) |

## Core rules

The SDK's general AI interface runs model calls in the desktop host, reusing the platform's model configuration. Plugins discover models with `ctx.ai.models()` and obtain text results via `ctx.ai.generate()`. See the [AI interface contract](AI.md) for the request and response contract.

Declare an `ocr` or `speech.tts` v1 provider under the manifest's `contributes.providers` and register the service with `ctx.services.provide()`. The host uses it in PDF, image and article features — no plugin page needs to be open. See the [provider contract](CAPABILITIES.md) for the full development protocol.

- **Commands and tasks**: a command returns a host-owned task; a single result stays under 1 MiB and large payloads are chunked by the plugin. `invocation.signal` provides cooperative cancellation and `progress()` reports progress. Cancel, exit and timeout can leave `uncertain` external results — side effects are never retried automatically.
- **Document access**: core documents follow snapshot → `apply` with `revision`, `draftHash` and a unique `operationId`; publishing and export scenarios use `readDocument` (immutable Markdown snapshot with SHA-256 verification).
- **Credentials**: secrets belong only in the backend's `ctx.credentials` (system credential store) — never in the manifest, sources or page state.
- **Pages**: `setState` is a JSON checkpoint of at most 64 KiB; the bridge is injected by the host and pages must not import Node modules.

## Development and publishing (this repository)

```bash
npm ci
npm test            # JS tests + strict TypeScript consumer checks
npm pack --dry-run  # verify the npm package contents
```

This repository is the authoritative source for the public SDK; the host ships a verified physical artifact with each release. Publishing: create a GitHub Release (tag `v` + the `package.json` version); the workflow verifies the match and publishes to npm.

## Related projects

- Template: [blc-plugin-template](https://github.com/biglazycat-writer/blc-plugin-template) — a ready-to-run plugin starting point
- Reference implementations: [blc-export-book](https://github.com/biglazycat-writer/blc-export-book) (typeset export), [blc-plugin-publish](https://github.com/biglazycat-writer/blc-plugin-publish) (WeChat publishing)
- Help center "Plugin Development" section: in-app development process and SDK reference

## User-facing features

Declare each configurable action in `contributes.features`, including where it can appear and what it runs. BigLazyCat Writer lets users choose among those locations. See the [feature declaration reference](FEATURES.md).

## Plugin icons

Declare an icon in the manifest's `icon` field; it appears on the plugin page, sidebar entries and plugin-store cards:

- `tabler:cat`, `lucide:sparkles`: names from the host's built-in icon libraries;
- `assets/logo.png`: an image shipped with the plugin (`.png/.jpg/.jpeg/.webp`, up to 256 KiB), served by the host through `/plugin-icon/`;
- `🐱`: an emoji or short text of at most 8 characters.

Declaring `icon` requires `minimumApiRevision: 8`; without it the UI keeps the puzzle-piece placeholder. Validation rules and error codes are described in the host's `docs/plugin-contract.md`, revision 8 section.
