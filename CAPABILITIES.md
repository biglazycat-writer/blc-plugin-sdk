# OCR、翻译与语音能力提供者

大懒猫创作平台通过统一能力接口，把插件的识别、翻译和语音引擎用于产品的原生操作。

OCR 默认调用内置 AI 大模型，用户在 PDF 或图片的识别操作中选择本次使用的插件。朗读由实现接口的插件提供，在朗读时选择；没有提供者时，产品不显示可用的朗读入口。插件中心管理安装和启停，插件自己的页面管理模型与音色。

## 注册能力

清单声明 API 1 修订 4，最低客户端通过 `engines.biglazycat` 指定。提供者 ID 和服务 ID 只需在本插件内唯一，宿主按插件 ID 区分。

```json
{
  "engines": {"node": ">=22.23.3 <23.0.0", "biglazycat": ">=0.4.7"},
  "biglazycat": {
    "apiVersion": 1,
    "minimumApiRevision": 4,
    "displayName": "我的本地识别引擎",
    "main": "dist/main.js",
    "platforms": ["windows/amd64"],
    "contributes": {
      "services": [{"id": "recognition", "version": "1.0.0", "methods": ["put", "finish", "start", "status", "result", "cancel", "release"]}],
      "providers": [{"id": "local", "contract": "ocr", "version": 1, "service": "recognition"}]
    }
  }
}
```

后台用 `ctx.services.provide('recognition', methods)` 注册同名服务。`methods satisfies OCRProviderService` 可检查类型。没有插件页面或用户命令也能提供能力；不需要声明宿主对本插件的依赖。

## OCR v1

产品调用 `desktopApi.recognizeOCR({image_src?, image_data_url?, format?, model_id?, source?, provider_id?})`；图片地址和 data URL 必须二选一。`format` 为 `text` 或 `markdown`，默认 `markdown`。返回 `{content, format, provider_id}`。

`provider_id` 省略或为空时使用内置 AI；选择插件时传 `<pluginId>:<providerId>`，例如 `blc-plugin-ocr:ocr`。提供者来自已安装插件的能力声明。选择只属于本次操作，不修改全局设置，也不保存默认提供者。

PDF 将单页或框选区域渲染为图片，统一接口只接收图片；整份 PDF 不跨插件 RPC 传输。旧的图片、区域和 PDF 页绑定均通过同一个调度器执行。`model_id` 仅选择内置视觉模型，插件模型通过插件设置选择。

| 服务方法 | 参数 | 返回和行为 |
| --- | --- | --- |
| `put` | `{id, index, chunk}` | 从 index 0 开始，顺序追加 JSON 字符串；每块最多 96 KiB UTF-8 字节 |
| `finish` | `{id}` | 校验并封存上传；载荷为 `{dataUrl: string}`，最多 32 MiB |
| `start` | `{transferId, format, source?}` | 消费上传并立即返回 `{jobId}`；后台开始识别 |
| `status` | `{jobId}` | `{state, progress?, error?, errorCode?}`；state 为 waiting/running/completed/failed/cancelled |
| `result` | `{jobId, offset, limit}` | 分块读取 UTF-8 JSON `{content: string, format: 'text'|'markdown'}` |
| `cancel` | `{jobId}` | 协作中止任务；终态重复取消应安全返回 |
| `release` | `{transferId?, jobId?}` | 释放上传和结果；缺失或已释放的 ID 应安全返回 |

图片没有文字时，返回空字符串。输出必须满足请求格式；本地识别提供者自行生成 Markdown，宿主不把普通文本强制解析成表格。插件应限制并发，释放过期任务和模型资源，保留失败错误码。

内置提供者通过配置的视觉模型执行识别；`ocr` 提供者使用本插件注册的服务。用户明确选择的插件缺失、停用、故障或模型未准备时，操作显示错误。不会自动切到视觉模型发送图片。

## OCR v2：结构化文档

新提供者声明 `minimumApiRevision: 6`，最低桌面客户端为 `>=0.4.9`，以 `contract: 'ocr', version: 2` 注册。同名服务增加 `capabilities` 方法，其余上传、任务和字节分块生命周期与 v1 相同。

`OCRProviderServiceV2` 检查服务类型。`start` 接收 `{transferId, source?, requirements?}`，不接收输出格式；`result` 读取的 UTF-8 JSON 为 `{document: OCRDocument}`，宿主派生文字与 Markdown。

`capabilities({})` 返回 `{geometry, blockTypes, styles, geometrySource}`。只声明模型实际支持的能力；不能推断的字体和结构应省略。宿主可通过 `requirements` 要求 region/line/word 粒度、块类型或样式，能力不足报 `OCR_CAPABILITY_UNSUPPORTED`。

文档类型见 `ocr-document.d.ts`。页面 `width/height` 为输入图像像素尺寸；`coordinateSpace: 'normalized'`，坐标为 0–1，左上原点。块支持检测多边形、阅读顺序、行与片段、列表和合并单元格。字号为输入图像像素单位。结果最多 20,000 个节点、32 MiB。

`geometrySource` 明确 detected 或 estimated，`estimatedStyleFields` 标出估算样式。阅读顺序独立于坐标；纯文本、Markdown 都无法还原位置。产品结构化请求使用 `format: 'document'`，响应同时保留 `document` 和派生 `content`。

v1 提供者不能满足结构化请求，宿主报 `OCR_LAYOUT_UNSUPPORTED`。内置视觉模型通过同一结构验证，坐标声明为 estimated；选定插件失败时不会自动切换模型。

## text.translate v1

通用翻译接口面向任意文本用途，不绑定某个产品页面。清单声明 API 1 revision 6，`contract: 'text.translate', version: 1`，服务方法为 `languages/translate`，用 `TranslationProviderService` 检查类型。

| 服务方法 | 输入 | 输出 |
| --- | --- | --- |
| `languages` | `{}` | `{pairs: [{source, target}], autoDetect, offline}` |
| `translate` | `{segments: [{id, text}], sourceLanguage?, targetLanguage}` | `{segments: [{id, text}], sourceLanguage, targetLanguage}` |

语言使用 BCP-47 形式代码；sourceLanguage 省略或为 auto 时要求 autoDetect，targetLanguage 必须明确。声明实际支持的语言对，最多 256 对。每片段 ID 唯一且最多 100 字节；单次 1–128 段、输入总计 256 KiB、输出 512 KiB。译文必须保留 ID，宿主校验并按输入顺序重排。

产品调用 `desktopApi.translateText({segments, source_language?, target_language, provider_id?, model_id?, request_id?})`。选择插件时传 `<pluginId>:<providerId>`，调用插件服务，不调用平台 AI；provider_id 为空时使用内置 AI。PDF 将 OCR 和翻译引擎分开选择，翻译插件无需实现 OCR。

插件可使用专用本地模型或第三方服务；认证信息由插件自己的加密凭据存储管理，不获得平台模型凭据。在线额度不足报 `TRANSLATION_QUOTA_EXCEEDED`，不支持语言报 `TRANSLATION_LANGUAGE_UNSUPPORTED`。必须响应 `invocation.signal`；产品通过 `cancelTranslation(request_id)` 取消，单次总时限 150 秒。

## speech.tts v1

语音提供者清单使用 `contract: 'speech.tts'`、`version: 1`，服务声明 `voices/synthesize/read/release`。用 `SpeechProviderService` 检查服务类型。

| 服务方法 | 参数 | 返回和行为 |
| --- | --- | --- |
| `voices` | `{}` | `{voices: [{id, name, language?}]}` |
| `synthesize` | `{text, voiceId?, speed?}` | `{audioId, mimeType}`；mimeType 为 audio/wav 或 audio/mpeg |
| `read` | `{audioId, offset, limit}` | 分块返回完整音频字节 |
| `release` | `{audioId}` | 释放临时音频；重复调用安全 |

单次最多 2000 字，语速范围 0.5–2，默认 1。音色 ID 省略时使用插件配置的默认音色。引擎必须响应 `invocation.signal`；宿主在取消或超时时发送 RPC 取消。单段音频最多 16 MiB，合成最长 120 秒。

产品调用 `desktopApi.synthesizeSpeech({text, provider_id, voice_id?, speed?, request_id?})` 得到 `{provider_id, audio_data_url}`，临时音频 ID 留在宿主内部。`provider_id` 必须明确指定 `<pluginId>:<providerId>`；缺失时报 `SPEECH_PROVIDER_REQUIRED`。`cancelSpeech(request_id)` 中止对应合成。宿主提供接口、调度与音频播放，没有内置语音合成实现。

文章工具栏朗读选中内容；没有选择时朗读整篇。PDF 文字选择工具栏朗读所选文字。产品将长文按句子分段合成和顺序播放，停止或关闭入口后不播放迟到的结果。

## 分块与生命周期

`result` 和 `read` 返回 `{chunk, nextOffset, total, hash, complete}`。`chunk` 是 base64 编码的原始字节，offset/nextOffset/total/limit 全部按字节；每块最多 96 KiB。`hash` 是完整内容的 SHA-256 小写十六进制，读取期间保持不变。

宿主验证偏移、体积、完整性和摘要，坏结果报 `PROVIDER_RESULT_INVALID`。识别总时限 120 秒。请求明确选择并固定提供者与进程代次；旧进程断开则当前操作失败，不能在新进程续读旧任务。OCR 未选插件时直接使用内置 AI，不依赖插件管理器初始化。

宿主在结果读完、失败或超时后尝试取消并释放 OCR 任务，读取音频后释放音频。插件还应自行过期清理，处理宿主退出后的残留。内置与插件错误均呈现在发起操作的产品界面中。

类型定义以 SDK 为准，参考实现为 [本地 OCR](https://github.com/biglazycat-writer/blc-plugin-ocr) 和 [语音工坊](https://github.com/biglazycat-writer/blc-plugin-voice)。发布检查见 [插件公共契约](plugin-contract.md)。
