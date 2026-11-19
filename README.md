# 大懒猫创作平台插件 SDK（blc-plugin-sdk）

大懒猫创作平台的官方插件 SDK：类型定义、清单 schema 与宿主桥接入口。插件后台与页面通过它和桌面端通信，实际平台能力由宿主桥接提供。

- npm 安装：`npm install blc-plugin-sdk`
- 后台运行环境：Node `>=22.23.3 <23.0.0`
- 接口主版本为 1，按修订递进：修订 1 文档分块导出，修订 2 明暗模式、页面就绪与用户入口声明，修订 3 文稿导航
- 修订 4 提供 OCR 与语音能力契约：`OCRProviderService`、`SpeechProviderService` 与标准字节分块结果
- 修订 5 提供通用文本生成；修订 6 提供结构化 OCR 与独立的 `text.translate` 翻译契约
- 许可证：[MIT](LICENSE)

## 快速上手

后台入口 `blc-plugin-sdk` 导出 `definePlugin`：

```ts
import { definePlugin } from 'blc-plugin-sdk'

export default definePlugin(ctx => {
  ctx.commands.register('hello', async (_args, invocation) => {
    invocation.signal.throwIfAborted()
    return { message: '你好，大懒猫创作平台！' }
  })
  return async () => { /* 释放自己创建的连接、监听器等 */ }
})
```

页面入口 `blc-plugin-sdk/browser` 提供 `connect()`：

```ts
import { connect } from 'blc-plugin-sdk/browser'
const sdk = await connect()
const view = await sdk.context()
```

`package.json` 的 `biglazycat` 字段是插件唯一清单，字段集合受随包提供的 `manifest.schema.json` 约束；完整签名以 `index.d.ts` 与 `browser.d.ts` 为准。从零开始建议直接用官方模板工程 [blc-plugin-template](https://github.com/biglazycat-writer/blc-plugin-template)。

## 包内容

| 导入路径 | 用途 |
| --- | --- |
| `blc-plugin-sdk` | 后台入口：`definePlugin`、`readDocument`、`waitForTask`、`PluginError` 与全部类型定义 |
| `blc-plugin-sdk/browser` | 页面入口：`connect()` 与 `BrowserAPI` 类型 |
| `blc-plugin-sdk/manifest.schema.json` | `biglazycat` 清单的 JSON Schema（draft 2020-12） |

## 核心规则

SDK 的通用 AI 接口由桌面端执行模型调用，复用平台模型配置；插件通过 `ctx.ai.models()` 查询模型，通过 `ctx.ai.generate()` 获取文本结果。请求与响应契约见 [通用 AI 接口](AI.md)。

OCR 与语音提供者在清单的 `contributes.providers` 中声明 `ocr` 或 `speech.tts` v1，并用 `ctx.services.provide()` 注册服务。宿主将其用于 PDF、图片与文章功能；无需打开插件页面。完整开发协议见 [能力提供者接口](CAPABILITIES.md)。

- **命令与任务**：命令返回宿主持有的任务，单次结果小于 1 MiB，大内容由插件自行分段传输；`invocation.signal` 协作取消，`progress()` 报告进度。取消、退出与超时可能留下 `uncertain` 的外部执行结果，不自动重试有副作用的操作。
- **文档读写**：核心文档先 `snapshot`，再携带 `revision`、`draftHash` 与唯一 `operationId` 调用 `apply`；发布与导出场景用 `readDocument`（不可变 Markdown 快照，SHA-256 校验）。
- **凭据**：密钥只放后台 `ctx.credentials`（系统凭据存储），不进清单、源码或页面状态。
- **页面**：状态 `setState` 是最多 64 KiB 的 JSON 检查点；桥接由宿主注入，页面禁止直接导入 Node 模块。

## 开发与发布（本仓库）

```bash
npm ci
npm test            # JS 测试 + 严格 TypeScript 消费者检查
npm pack --dry-run  # 核对 npm 包内容
```

本仓库是公开 SDK 的源码权威；宿主随版本携带经过校验的物理工件。发布流程：创建 GitHub Release（标签 `v` + `package.json` 版本），工作流校验一致后自动发布 npm。

## 相关项目

- 模板工程：[blc-plugin-template](https://github.com/biglazycat-writer/blc-plugin-template) —— 开箱即跑的插件起点
- 参考实现：[blc-export-book](https://github.com/biglazycat-writer/blc-export-book)（排版导出）、[blc-plugin-publish](https://github.com/biglazycat-writer/blc-plugin-publish)（微信公众号发布）
- 帮助中心「插件开发」章节：桌面端内的开发流程与 SDK 接口速查
