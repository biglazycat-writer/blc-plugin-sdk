# 更新日志

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循语义化版本。

## [1.6.0] - 2026-11-20

- API 1 修订 6：OCR v2 提供者契约，保留阅读顺序、行与片段、列表与合并单元格，坐标统一为 0–1。
- 新增 `text.translate` v1 通用翻译契约，服务方法为 `languages/translate`。
- 新增 `ocr-document.d.ts`、`translation.d.ts` 与能力提供者文档 `CAPABILITIES.md`。
- 最低客户端版本随修订登记为 0.4.9；已有 API 1 契约保持稳定。

## [1.5.0] - 2026-11-19

- API 1 修订 5：通用 AI 模型查询与文本生成接口，由桌面端统一调用模型网关、管理凭据并记录 AI 日志。
- 新增 `AI.md` 说明调用约定与错误语义；最低客户端版本 0.4.8。

## [1.4.0] - 2026-11-19

- API 1 修订 4：`export.text`、`ocr` v1 与 `speech.tts` 能力提供者声明，带版本校验。
- 新增 `ProviderContract` 与提供者清单类型，配套 `SpeechProviderService`、OCR 服务类型。

## [1.3.0] - 2026-11-15

- API 1 修订 3：`ui.openDocument` 在主窗口打开指定工作区会话的文稿，不要求原编辑器仍打开。
- 页面标题、返回与刷新控件由插件自行提供；宿主保留保存、容器生命周期与故障恢复。
- 文稿导航等待保存协调和主窗口确认，拒绝过期请求与工作区切换；已有 API 1 契约保持稳定。

## [1.2.0] - 已随插件工件提供，未单独发布到 npm

- API 1 修订 2：宿主解析后的明暗模式读取与订阅、页面可用时的 ready 确认及加载耗时。
- 命令 visibility 区分用户入口和内部调用，页面 commandPalette 可关闭重复入口；AI 权限独立。
- 更新类型、清单 schema 与严格消费者测试；已有 API 1 契约保持稳定。

## [1.1.0] - 2026-11-13

- 新增完整英文 README，并在中英文文档之间提供切换链接。
- API 1 修订 1：最低宿主修订声明、Markdown v1 分块导出、公开 DTO 类型。
- 新增 PluginError、waitForTask（超时/取消不重放任务）和 readDocument（固定快照、UTF-8 偏移、SHA-256）。
- Node 声明改为 >=22.23.3 <23.0.0；精确交付版本与插件 engines 分开。
- 严格 TypeScript 消费者检查和 GitHub Actions 持续测试；宿主固定旧 SDK 1.0.0 工件单独验收。
- 主程序桥接实现继续由宿主持有；同一 API 主版本保持已发布行为。独立 SDK 仓库是公开源码权威，宿主/模板只导入有校验的物理工件。

## [1.0.0] - 2026-11-13

首个公开 npm 版本，从各插件工程内的 `vendor/plugin-sdk` 物理副本提取为独立包 `blc-plugin-sdk`。

### 新增

- `blc-plugin-sdk`：`definePlugin`、`apiVersion` 及完整的 `PluginContext` / `SharedAPI` / `Json` / `Invocation` 等类型定义。
- `blc-plugin-sdk/browser`：页面端 `connect()` 与 `BrowserAPI` 类型；桥接仍由宿主在运行时注入。
- `blc-plugin-sdk/manifest.schema.json`：`package.json` → `biglazycat` 清单的 JSON Schema（draft 2020-12）。
- 自带测试覆盖插件激活/清理、无宿主时的 `API_MISMATCH`、清单扩展点约束。
- GitHub Actions 发布工作流：`release: published` 触发（或手动运行），需 `NPM_TOKEN` secret，带 provenance；发布前校验 Release 标签与版本号一致，并对已发布版本做幂等跳过。

### 变更

- 包名由 `@biglazycat/plugin-sdk` 改为 `blc-plugin-sdk`，依赖方式由 `file:vendor/plugin-sdk` 改为 npm registry。
- 运行时代码与类型签名保持不变；插件工程只需修改依赖声明与 import 路径。
