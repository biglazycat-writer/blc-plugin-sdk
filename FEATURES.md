# 功能入口声明

大懒猫写作的功能入口协议让插件决定展示哪些用户功能，再由用户选择把功能放在哪里。

在 `biglazycat.contributes.features` 声明功能，设置 `minimumApiRevision: 7`，并按客户端版本要求声明最低宿主。类型定义为 SDK 的 `FeatureContribution`；当前版本要求见 CHANGELOG。

```json
{
  "id": "export",
  "title": "排版导出",
  "actions": {
    "toolbar": { "command": "export.article" },
    "editor": { "command": "export.article" },
    "resource": { "command": "export.book" },
    "sidebar": { "view": "main" }
  },
  "defaults": ["toolbar", "editor", "resource"]
}
```

同一功能只有一个稳定的 `id`，名称和命令数量由插件决定。宿主逐项显示声明；不按名称合并，也不根据公开命令、页面或提供者自动增加功能。声明空数组表示没有可配置功能。

## 支持的位置

| actions 键 | 用户看到的位置 | 调用上下文 |
| --- | --- | --- |
| toolbar | 编辑器工具栏 | 当前文稿与选区 |
| editor | 编辑器右键菜单 | 右键时的文稿与选区 |
| resource | 本地创作区右键菜单 | 选中的文件、目录或根目录 |
| sidebar | 左侧面板菜单 | 工作区，不附带编辑器或选中的资源 |

`actions` 的键就是用户可以选择的位置，至少声明一项。`defaults` 可省略或留空，表示初次安装不放置入口。用户可以多选、取消、清空或恢复默认；保存后覆盖插件默认值。

## 对应动作

每个位置只能声明一种动作：

- `command`：运行本插件已声明的公开命令，传入该位置的上下文；命令注册方式沿用 `ctx.commands.register`。
- `view`：打开本插件已声明的页面，容器遵循页面的 `defaultLocation`。
- `speech`：播放当前文章，值为本插件的 `speech.tts` 提供者 ID，仅允许编辑器的两种位置。

语音插件可以自行声明「文章播放」与「播客制作」，也可以只声明其中一项。提供语音服务本身不会自动产生播放入口。

```json
[
  { "id": "play", "title": "文章播放", "actions": { "toolbar": { "speech": "speech.tts" }, "editor": { "speech": "speech.tts" } }, "defaults": ["toolbar"] },
  { "id": "podcast", "title": "播客制作", "actions": { "toolbar": { "command": "voice.open" }, "editor": { "command": "voice.open" } }, "defaults": ["toolbar", "editor"] }
]
```

名称、说明和支持的位置都来自插件。宿主仅验证引用是否存在、动作是否唯一及上下文是否满足，不替作者选择功能数量。

## 命令、页面与服务

公开命令仍可供 AI、插件页面和服务调用。音色查询、模型下载、任务轮询及字节传输无需声明为用户功能；是否 `aiCallable` 与是否提供菜单入口独立。

`contributes.menus` 继续提供插件直接声明的固定菜单位置。可配置功能使用 `features`，避免同时为同一动作再声明固定菜单。`mainView` 和 `settingsView` 继续由插件管理中的「打开」和「设置」使用。
