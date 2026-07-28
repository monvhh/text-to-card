# 安装与使用

## 1. 安装插件

### 使用发布包

1. 解压 `release/xhs-text-card-1.0.0.zip`
2. 将其中的 `xhs-text-card` 文件夹复制到：

   ```text
   你的 Vault/.obsidian/plugins/
   ```

3. 重启 Obsidian，或执行“重新加载应用而不保存”
4. 打开 **设置 → 第三方插件**
5. 启用 **XHS Text Card**

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
- 前后移动页面、合并、拆分和隐藏页面
- 下载单页或将编辑后的全部页面打包为 ZIP
- 最大页数检查和强制分页、锁定块、隐藏块指令

## 3. 从 Obsidian 生成

可以从以下入口打开生成窗口：

- 命令面板：**生成小红书图文卡片**
- 左侧 Ribbon 图片按钮
- Markdown 编辑器右键菜单
- 文件列表中 Markdown 文件的右键菜单

如果编辑器有选区，插件只生成选中的 Markdown；没有选区时生成整篇当前笔记。

生成流程：

1. 选择模板、品牌预设和图片格式
2. 调整字号、间距、颜色、字体、Logo、封面和输出选项
3. 点击 **生成图片**，进入 Canvas 分页预览
4. 检查并编辑页面
5. 点击 **导出图片**

## 4. 分页编辑器

插件先智能分页，再让你确认最终页面：

- **左移 / 右移**：改变页面顺序
- **与下一页合并**：将两页内容合在一起
- **删除页面**：从本次导出中移除整页
- 默认只显示卡片级操作，内容块高级编辑暂不在界面中展示
- **前后移动**：调整卡片顺序
- **合并 / 拆分**：快速调整卡片数量
- **隐藏**：从本次导出中移除整张卡片

当实际页数超过“最大页数”时，编辑器会提示并禁用导出。可以继续合并、隐藏，
或返回调整字号和内容。

## 5. Markdown 与 Obsidian 语法

支持标题、段落、粗体、斜体、删除线、高亮、引用、列表、任务列表、代码、图片、
Callout 和脚注。

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

在 **设置 → XHS Text Card → 自定义模板** 中可以：

- 从当前默认样式创建模板
- 复制已有自定义模板
- 导入或导出 JSON
- 删除模板
- 收藏模板

生成窗口会优先展示收藏和最近使用的模板。内置模板不能删除，但可以作为自定义
模板的基础样式。

## 7. 封面与图片

默认封面使用模板内置封面。自定义封面路径填写 Vault 内图片路径，例如：

```text
assets/covers/post-cover.jpg
```

Markdown 图片支持：

```md
![[assets/photo.png]]
![说明](assets/photo.png)
```

远程图片受来源站点跨域策略影响，稳定生产时建议保存到 Vault。

## 8. 导出与更新

支持：

- PNG 无损输出
- JPEG 0.92 输出
- 1242 像素宽高清输出
- 生成后把图片链接插回笔记
- 复制首图到剪贴板
- 在文件管理器中定位输出目录

默认每次生成新的时间戳目录。打开 **更新已有输出** 后，同一笔记和模板使用稳定
目录，覆盖同名图片，并删除上次遗留的多余页，适合反复修改文章后刷新素材。

多模板批量生成时，目录名会自动加模板后缀；也可以使用“输出名称后缀”自行区分。

## 9. 批量生成

从命令面板执行 **批量生成小红书卡片**：

1. 输入 Vault 文件夹路径，留空表示整个 Vault
2. 可选输入标签，如 `#xhs`
3. 勾选一个或多个内置模板
4. 选择是否更新已有输出
5. 开始生成

批量任务会显示进度，并在结束后汇总成功与失败文件。为避免大量修改笔记或弹出
窗口，批量模式不会执行“插回笔记、复制首图、打开输出位置”等生成后动作。

## 10. YAML 按笔记覆盖

在笔记 Frontmatter 中使用以下属性，可以覆盖全局默认值：

```yaml
---
xhs-template: starry-night
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

模板值可以是内置模板 ID 或自定义模板 ID。布尔值接受 YAML 的 `true` / `false`。

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

所有默认参数都在 **设置 → XHS Text Card**。从旧版本升级时，插件会合并新字段
的默认值；原有输出目录、格式、样式和生成后动作会保留。自定义模板和品牌预设
存储在插件配置中。

完整自动测试与人工回归步骤见 [TESTING.md](TESTING.md)。
