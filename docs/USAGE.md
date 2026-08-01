# 安装与使用

## 1. 安装插件

### 使用发布包

1. 解压最新的 `release/xhs-text-card-x.y.z.zip`
2. 将其中的 `xhs-text-card` 文件夹复制到：

   ```text
   你的 Vault/.obsidian/plugins/
   ```

3. 重启 Obsidian，或执行“重新加载应用而不保存”
4. 打开 **设置 → 第三方插件**
5. 启用 **Text to Card**

### 从源码构建

需要 Node.js 18 或更高版本：

```bash
npm install
npm run build
```

将生成的 `main.js`、`manifest.json` 和 `styles.css` 复制到
`Vault/.obsidian/plugins/xhs-text-card/`。

## 2. 不安装 Obsidian，直接开发预览

```bash
npm install
npm run preview
```

浏览器打开 `http://localhost:5173/`。左侧编辑 Markdown 和样式，右侧实时查看
Canvas 渲染结果。浏览器预览与插件共用模板、Markdown、分页和渲染核心，适合
日常开发，不必每次重新复制插件文件。

浏览器预览支持：

- 切换 12 款模板、字号、行高、字间距、边距、配色和字体
- 设置签名、Logo URL、自定义封面 URL、页码、格式和高清倍率
- 保存、应用和删除品牌预设
- 预览页面，并隐藏不需要导出的页面
- 下载单页或将编辑后的全部页面打包为 ZIP
- 最大页数检查和强制分页、锁定块、隐藏块指令

## 3. 从 Obsidian 生成

快速生成入口：

- 命令面板：**Make cards**
- 在 **设置 → 快捷键** 搜索 `Text to Card: Make cards` 并绑定快捷键
- 左侧 Ribbon 图片按钮
- Markdown 编辑器右键菜单
- 文件列表中 Markdown 文件的右键菜单

如果编辑器有选区，插件只生成选中的 Markdown；没有选区时生成整篇当前笔记。
**Make cards** 使用插件设置和当前笔记的 YAML 覆盖值，直接生成并保存图片，
不会打开参数窗口或分页预览。配置好默认模板、尺寸和输出目录后，按一次快捷键
即可完成出图。

需要先查看和调整结果时，从命令面板执行 **Preview cards**：

1. 选择本次使用的模板或品牌预设
2. 决定是否生成封面，并按需修改封面标题
3. 点击 **应用设置并刷新预览**，进入 Canvas 分页预览
4. 检查页面，并按需删除不导出的页面
5. 点击 **保存卡片**

弹框底部提供默认收起的 **默认设置（展开修改）**。展开后可以修改本次实际
使用的页面比例、格式、输出目录、排版、颜色、字体、图片、品牌信息、页数限制和
生成后操作。修改后点击 **应用设置并刷新预览**，插件会重新解析内容、分页并
渲染，不会复用旧预览会话。当前笔记没有 YAML 覆盖时，还会保存为后续默认值。

预览页顶部会显示实际基准画布尺寸，并提供 **修改设置** 按钮。返回设置时会
保留刚才的修改，再次刷新后即可对比效果。

页面比例、图片格式、输出目录、字号、行高、字间距、边距、文字色、强调色、字体、
Logo、水印、页码、最大页数和生成后操作可以在 **设置 → Text to Card** 中配置
长期默认值，也可以在预览弹框的折叠区中临时调整。

生成过程中通知栏会依次显示 Markdown 解析、分页、当前渲染页、保存页和质量检查。
失败信息包含错误代码、原因和建议操作，方便区分内容、页数、路径、图片或 Canvas
问题。

开启 **将 Obsidian 文章标题加入图片** 后，插件会把当前笔记的文件名作为一级
标题加入生成内容；如果正文开头已经是同名一级标题，则不会重复添加。关闭后，
插件完全按文档原内容生成图片。两种模式都不会修改原笔记。

卡片背景色由所选模板固定，不读取 Obsidian 的浅色或深色主题，也不会被旧的
插件背景色配置覆盖。默认“极简杂志”始终使用 `#FFFFFF`。

页面比例支持：

- **小红书长文 2:3**：500 × 750 基准画布
- **小红书 3:4**：500 × 667 基准画布，默认选项
- **短视频 9:16**：500 × 889 基准画布

切换比例后会按新的可用高度重新分页。高清导出宽度保持 1242 像素，高度根据
所选比例自动计算。

字体菜单提供：

- 苹方 / 系统默认
- 得意黑
- 霞鹜文楷
- 思源宋体
- 思源黑体
- 站酷黄油体
- 站酷快乐体
- 马善政毛笔
- 楷体

也可以在字体菜单右侧填写自定义 CSS 字体族。插件不会为了字体选择额外联网；
如果设备没有安装所选字体，Canvas 会使用该选项的后备字体。

签名和水印统一放在设置页的 **品牌预设** 区域，分别通过“品牌签名”和
“品牌水印”配置；浏览器开发预览也使用相同分组。保存品牌预设时会连同颜色、
字体和 Logo 一起保存。切换模板不会清空品牌水印。

设置封面或 Logo 时，点击对应项目右侧的 **选择图片**，搜索并选择 Vault 内的
图片即可，插件会自动保存路径。右侧的清除按钮可以恢复为空。浏览器开发预览
使用系统文件选择器读取本地图片；图片只在当前页面中使用，不会上传。

## 4. 分页编辑器

插件先智能分页，再让你确认最终页面：

- **删除页面**：从本次导出中移除整页
- 默认只显示卡片级操作，内容块高级编辑暂不在界面中展示
- **隐藏**：从本次导出中移除整张卡片

当实际页数超过“最大页数”时，编辑器会提示并禁用导出。可以删除部分卡片，
或返回设置提高最大页数。

## 5. Markdown 与 Obsidian 语法

支持标题、段落、粗体、斜体、删除线、高亮、引用、列表、任务列表、代码、图片、
表格、Mermaid、Callout 和脚注。表格会按行参与分页；Mermaid 由 Obsidian 当前
版本渲染为 SVG 后放入卡片。

### Wiki 链接与嵌入

```md
[[另一篇笔记]]
![[assets/photo.png]]
![[另一篇笔记]]
![[另一篇笔记#某个章节]]
```

笔记嵌入会展开全文或对应章节；图片嵌入会读取 Vault 中的资源。

### 强制分页

单独一行的水平线会从此处开始新页：

```md
第一页

---

第二页
```

### 隐藏创作备注

```md
<!-- xhs-hide-start -->
这段内容不会出现在图片中
<!-- xhs-hide-end -->
```

### 锁定内容块

```md
<!-- xhs-keep-start -->
## 标题
这段内容尽量整体出现在同一页
<!-- xhs-keep-end -->
```

如果锁定块本身高于一整张卡片，插件会自动恢复智能拆分，避免内容裁切。

## 6. 品牌与模板

### 品牌预设

品牌预设保存主题色、签名、字体和 Logo。可以在生成窗口应用，也可以在设置页
创建、应用和删除。

Logo 路径使用 Vault 内路径，例如：

```text
assets/brand/logo.png
```

字体填写设备上已经安装的 CSS 字体族，例如：

```text
PingFang SC, sans-serif
```

### 自定义模板

自定义模板入口当前暂时隐藏，以精简设置和生成流程。创建、复制、删除、JSON
导入导出、应用和数据兼容代码仍保留；已有数据不会被删除。实现细节和重新启用
方法见 [自定义模板功能说明](CUSTOM_TEMPLATES.md)。

生成窗口按固定的内置模板顺序展示，不提供收藏或最近使用排序。

## 7. 封面与图片

默认封面使用模板内置封面。自定义封面路径填写 Vault 内图片路径，例如：

```text
assets/covers/post-cover.jpg
```

Markdown 图片支持：

```md
![[assets/photo.png]]
![说明](assets/photo.png)
![带空格路径](<assets/my photo.png>)
```

远程图片会先由插件下载并转换为本次生成使用的内联数据，避免 Canvas 跨域污染。
单张远程图片上限为 12 MB；无法访问时质量检查会提示，稳定生产仍建议保存到 Vault。

## 8. 导出与更新

支持：

- PNG 无损输出
- JPEG 0.92 输出
- 1242 像素宽高清输出
- 生成后把图片链接插回笔记
- 复制首图到剪贴板
- 在文件管理器中定位输出目录
- 导出完成后执行图片尺寸、空文件和加载失败图片检查
- 在支持的设备上打开系统分享面板

默认每次生成新的时间戳目录。打开 **更新已有输出** 后，同一笔记和模板使用稳定
目录，覆盖同名图片，并删除上次遗留的多余页，适合反复修改文章后刷新素材。

多模板批量生成时，目录名会自动加模板后缀；也可以使用“输出名称后缀”自行区分。

每次单篇成功生成后都会保存一条“上次生成”记录，不复制图片本身。可以在设置页
打开、分享或清除记录，也可以使用 **Open last generated cards** 和
**Share last generated cards** 命令。清除记录不会删除已经生成的图片。

品牌预设可以在设置页导出为 Vault 根目录的 `Text-to-Card-Presets.json`。导入
时选择该 JSON 文件，插件会按预设 ID 合并，不会删除当前已有预设。

## 9. 批量生成

从命令面板执行 **Make cards in batch**：

1. 输入 Vault 文件夹路径，留空表示整个 Vault
2. 可选输入标签，如 `#xhs`
3. 勾选一个或多个内置模板
4. 选择是否更新已有输出
5. 开始生成并直接保存图片

批量任务不进入分页预览，会显示进度，并在结束后汇总成功与失败文件。为避免
大量修改笔记或弹出窗口，批量模式不会执行“插回笔记、复制首图、打开输出位置”
等生成后动作。

## 10. YAML 按笔记覆盖

在笔记 Frontmatter 中使用以下属性，可以覆盖全局默认值：

```yaml
---
xhs-template: starry-night
xhs-page-ratio: "3:4"
xhs-font-size: 36
xhs-line-height: 1.6
xhs-letter-spacing: 1
xhs-content-padding: 64
xhs-primary-color: "#101828"
xhs-secondary-color: "#475467"
xhs-accent-color: "#e11d48"
xhs-font-family: "PingFang SC, sans-serif"
xhs-logo: assets/brand/logo.png
xhs-cover-image: assets/covers/custom.jpg
xhs-signature: "@alice"
xhs-use-file-title: true
xhs-watermark: true
xhs-cover: true
xhs-page-number: true
xhs-max-pages: 10
xhs-format: png
xhs-high-res: false
xhs-update-existing: true
xhs-output-suffix: campaign-a
---
```

当前界面使用内置模板 ID。布尔值接受 YAML 的 `true` / `false`。

## 11. Obsidian URI 自动化

安装并启用插件后，可以从浏览器、快捷指令或其他应用调用：

打开单个文件的生成窗口：

```text
obsidian://xhs-text-card?file=Notes%2FPost.md
```

使用指定模板直接生成并更新稳定目录：

```text
obsidian://xhs-text-card?file=Notes%2FPost.md&run=true&template=blank&update=true
```

批量生成文件夹，用逗号分隔多个模板并按标签筛选：

```text
obsidian://xhs-text-card?folder=Posts&templates=blank,starry-night&tag=xhs&update=true
```

参数说明：

- `file`：Vault 内 Markdown 文件路径
- `run=true`：单文件跳过参数窗口并直接进入生成流程
- `template`：单文件模板 ID
- `folder`：批量文件夹路径
- `templates`：批量模板 ID，逗号分隔
- `tag`：批量标签，可省略 `#`
- `update=true`：更新稳定输出目录

如果没有 `file` 或 `folder`，插件使用当前活动笔记。

## 12. 设置与迁移

所有默认参数都在 **设置 → Text to Card**。配置包含独立的数据结构版本；从旧
版本升级时按版本逐步迁移并校验数值范围，原有输出目录、格式、样式、生成后动作、
自定义模板和品牌预设会保留。智能封面不在当前功能或路线图中。

完整自动测试与人工回归步骤见 [TESTING.md](TESTING.md)。
