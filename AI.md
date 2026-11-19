# 通用 AI 接口

插件 SDK 向第三方开发者开放平台的通用 AI 接口，当前提供模型查询与文本生成，由桌面端统一管理模型调用和凭据。

SDK 定义请求、响应和调用规则；具体业务由插件传入的提示词及其处理逻辑决定。

## 接入

插件清单声明 `minimumApiRevision: 5`，客户端要求为 `engines.biglazycat: ">=0.4.8"`。
插件后台使用 SDK 的 `ctx.ai.generate()`；页面通过自己的插件命令发起生成。

```ts
import {definePlugin} from 'blc-plugin-sdk';

export default definePlugin(ctx => {
  ctx.commands.register('text.generate', async (args: {prompt: string; systemPrompt?: string}, invocation) => {
    const result = await ctx.ai.generate({
      prompt: args.prompt,
      systemPrompt: args.systemPrompt,
      maxTokens: 4096,
    }, invocation);
    return {text: result.text};
  });
});
```

示例命令 `text.generate` 需要在插件清单的 `contributes.commands` 中声明。

省略 `modelId` 时使用平台默认可用文本模型。通过 `await ctx.ai.models()` 获取已启用模型的 ID、显示名称和默认标记，传入其中的 ID 可为本次请求选择模型。
API Key 与连接地址保留在宿主，插件只发送要求和内容；调用不会创建 Agent 会话或执行 Agent 工具。

## 契约

| 接口 | 输入 | 返回 |
| --- | --- | --- |
| `ai.models()` | 无 | `[{id, name, isDefault}]`，只包含已启用文本模型 |
| `ai.generate(request, options?)` | `{prompt, systemPrompt?, modelId?, maxTokens?}` | `{text, modelId, model, provider, requestId}` |

`prompt` 必填；提示与系统要求合计最多 256 KiB。`maxTokens` 省略或为 0 时采用模型服务的默认值，显式上限范围为 1–16384；文本结果最多 512 KiB，仍受 RPC 帧大小约束。
宿主生成时限为 150 秒，SDK 为此方法保留 180 秒通信窗口；同时最多运行 4 个插件 AI 请求。

传入 `{signal}` 或直接传入 `invocation` 即可取消。取消会传到宿主及模型 HTTP 请求，停用插件时也会取消进行中的请求。
错误保留 `code/message`，包括 `MODEL_UNAVAILABLE`、`MODEL_TIMEOUT`、`CANCELLED`、`BACKPRESSURE` 与 `MESSAGE_TOO_LARGE`。

模型使用现有的平台配置、使用告知和 AI 日志。未配置模型或请求失败时，应向用户说明原因；由用户选择其他处理方式。

## 已有会话接口

`ai.run({conversationId, text})` 仍用于向已有 Agent 会话发送指令，返回会话任务信息。
需要文本生成结果的插件应使用 `ai.generate()`，直接读取返回的 `text`。
