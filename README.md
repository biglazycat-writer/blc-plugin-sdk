# blc-plugin-sdk

[大懒猫创作平台](https://github.com/biglazycat-writer) 插件 SDK v1 的公开 npm 包。提供后台与页面的类型定义、插件清单 JSON Schema，以及 `definePlugin` / `connect` 两个入口。

```bash
npm install blc-plugin-sdk
```

仓库：<https://github.com/biglazycat-writer/blc-plugin-sdk> · npm：<https://www.npmjs.com/package/blc-plugin-sdk>

> **重要**：本包是薄封装，不含宿主实现。页面桥接 `__sdk.mjs` 由大懒猫创作平台在运行时注入，`connect()` 只能在该应用的插件视图内调用。插件后台运行在宿主提供的 Node 进程中，安装包本身不携带 Node。

## 版本兼容

| SDK 版本 | 插件 API | Node | 说明 |
| --- | --- | --- | --- |
| `1.0.0` | `biglazycat.apiVersion = 1` | `22.23.3` | 首个公开版本 |

`apiVersion` 与宿主能力一一对应，升级 SDK 前先确认目标宿主支持该版本；宿主的平台准备流程按 `package-lock.json` 执行 `npm ci`，因此插件工程应提交锁文件。

## 导出

| 入口 | 内容 |
| --- | --- |
| `blc-plugin-sdk` | `definePlugin`、`apiVersion`、全部 `PluginContext` / `SharedAPI` / `Json` 等类型 |
| `blc-plugin-sdk/browser` | 页面端 `connect()`、`BrowserAPI` 类型 |
| `blc-plugin-sdk/manifest.schema.json` | `package.json` → `biglazycat` 字段的 JSON Schema（draft 2020-12） |

运行时代码是纯 ESM、零依赖；`sideEffects: false`，打包工具可安全 tree-shake。

## 后台入口

```ts
import { definePlugin, type Invocation, type PluginContext } from 'blc-plugin-sdk';

export default definePlugin(async (ctx: PluginContext) => {
  ctx.commands.register('hello.world', async (_args, invocation: Invocation) => {
    invocation.signal.throwIfAborted();
    await invocation.progress(0.5, '处理中');
    return { message: `你好，来自 ${ctx.pluginId}` };
  });

  return () => {
    // 停用插件时释放连接、定时器等资源
  };
});
```

所有命令必须在激活期注册，且与清单中的 `contributes.commands` 逐字一致。命令返回宿主持有的**任务**，结果需可序列化为 JSON。

## 页面入口

```ts
import { connect } from 'blc-plugin-sdk/browser';

const sdk = await connect();
const view = await sdk.context();

const task = await sdk.commands.invoke('hello.world');
for (;;) {
  const current = await sdk.tasks.get(task.id);
  if (current.state === 'completed') { console.log(current.result); break; }
  if (['failed', 'cancelled', 'interrupted', 'uncertain'].includes(current.state)) {
    throw new Error(current.error ?? current.state);
  }
  await new Promise(resolve => setTimeout(resolve, 150));
}
```

页面用 `sdk.setState()` 保存小型恢复状态（≤ 64 KiB），`sdk.onSave()` 在宿主保存时写回并清除 dirty。禁止在浏览器直接导入 Node 模块；页面可以使用任意前端框架。

## 插件清单

`package.json` 的 `biglazycat` 字段是唯一清单，字段集合受 `manifest.schema.json` 约束（顶层 `additionalProperties: false`）。最简形式：

```json
{
  "name": "blc-plugin-hello",
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": "22.23.3" },
  "dependencies": { "blc-plugin-sdk": "1.0.0" },
  "scripts": { "build": "tsc -p tsconfig.node.json" },
  "biglazycat": {
    "apiVersion": 1,
    "displayName": "Hello",
    "platforms": ["windows/amd64", "darwin/arm64", "linux/amd64"],
    "main": "dist/main.js",
    "contributes": {
      "commands": [{ "id": "hello.world", "title": "打招呼" }]
    }
  }
}
```

完整字段与约束见 [`manifest.schema.json`](manifest.schema.json)、类型见 [`index.d.ts`](index.d.ts)。主要能力：命令、菜单、视图、服务、编辑器、提供者、定时任务、文档与工作区资源、图片库、凭据存储、事件与 AI 调用。

## 从本地副本迁移

早期工程使用 `vendor/plugin-sdk` 物理副本与 `@biglazycat/plugin-sdk` 包名。迁移步骤：

1. `package.json` 依赖改为 `"blc-plugin-sdk": "1.0.0"`，删除 `file:vendor/plugin-sdk` 与 `.npmrc` 的 `install-links=true`。
2. 源码中所有 `@biglazycat/plugin-sdk` / `@biglazycat/plugin-sdk/browser` 改为 `blc-plugin-sdk` / `blc-plugin-sdk/browser`（导出签名不变）。
3. 删除 `vendor/plugin-sdk` 目录；`files` 字段中去掉 `vendor`。
4. 重新执行 `npm install` 生成 `package-lock.json`，再 `npm run build && npm test`。

> 运行时桥接仍由宿主提供，因此**仅升级本包不能获得新宿主能力**；`apiVersion` 不变时行为保持一致。

## 开发与发布

```bash
npm install           # 无第三方依赖，仅生成锁文件
npm test              # node --test tests/*.test.mjs
npm pack --dry-run    # 检查将要发布的文件清单
npm publish --access public
```

发布走 GitHub Actions：在仓库 Settings → Secrets and variables → Actions 添加 `NPM_TOKEN`（npm Automation token），然后推送 `v1.0.0` 标签或手动运行 workflow；CI 会执行测试、打包并用 provenance 发布。手动发布需本机 `npm login`。

版本策略：与宿主 `apiVersion` 对齐，遵循语义化版本；破坏性变更必须同时提升宿主 API 版本，不在包内做运行时兼容层。

## 授权

[MIT](LICENSE) © 2026 大懒猫创作平台 contributors
