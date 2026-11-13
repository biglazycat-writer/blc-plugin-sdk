# 更新日志

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循语义化版本。

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
