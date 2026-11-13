# 更新日志

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循语义化版本。

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
