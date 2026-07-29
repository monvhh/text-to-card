# Text to Card for Obsidian

Convert an Obsidian note or selected Markdown into multi-page 3:4 image cards.
Pagination and rendering run locally in Canvas, and note content is never uploaded.

## Features

- Twelve built-in visual templates
- PNG and JPEG export at 1242-pixel width
- 2:3, 3:4 and 9:16 page ratios with automatic repagination
- Canvas preview with optional page removal
- Markdown headings, lists, quotes, code, images, callouts, tasks and footnotes
- Obsidian Wiki links, image embeds, note embeds and section embeds
- Optional file-name heading with duplicate-title prevention
- Fixed template backgrounds, custom text/accent colors, typography, cover image, Logo, signature and watermark
- Vault image pickers for cover images and Logos
- Nine font presets plus custom font-family support
- Batch generation by Vault folder and tag
- Optional image-link insertion, first-image clipboard copy and output reveal
- Responsive layouts for desktop and mobile Obsidian

## Installation

After the plugin is accepted into the Community directory, install **Text to Card**
from **Settings → Community plugins → Browse**.

For manual installation, download `main.js`, `manifest.json` and `styles.css` from
the [latest GitHub release](https://github.com/monvhh/text-to-card/releases/latest).
Place them in:

```text
YourVault/.obsidian/plugins/xhs-text-card/
```

Reload Obsidian, then enable **Text to Card** under **Community plugins**.

## Usage

Open a Markdown note, then run **Make cards** from the
command palette to generate and save images immediately with the current
settings. The same quick action is available from the ribbon and context menus.
Run **Preview cards** when you want to change export settings, review or adjust
the template or cover, review or adjust pages, then save the cards from the
preview. Typography, colors, branding, output and post-generation actions are
managed once in the plugin settings. Use **Make cards in batch** to select a
folder, tag and templates before saving all matched notes directly.

If text is selected in the editor, only the selection is converted. Otherwise,
the entire active note is used.

## Permissions, privacy and security

- **Vault file enumeration:** Batch generation lists Markdown files only after
  the user explicitly starts a batch operation. This is used to find notes in
  the selected folder and apply the optional tag filter.
- **Vault read access:** The plugin reads the note selected by the user and any
  images, notes or sections embedded by that note.
- **Vault write access:** Generated images are written to the configured Vault
  output folder. The plugin modifies a source note only when the user enables
  insertion of generated image links.
- **Clipboard write access:** When the optional **Copy first image** action is
  enabled, the plugin writes the first generated image to the system clipboard.
  It does not read existing clipboard contents. Unsupported devices show a
  notice without interrupting image generation.
- **Network access:** Notes are not uploaded. A remote image referenced in
  Markdown is requested directly from its original host, which can expose
  standard request information to that host. Vault-local images do not make
  network requests.
- The plugin has no accounts, payments, subscriptions, advertisements or
  telemetry.
- The plugin does not publish content to Xiaohongshu or any other platform.

## Support and source code

Report bugs and request features through
[GitHub Issues](https://github.com/monvhh/text-to-card/issues).
The plugin is open source under the MIT License.

The rendering, template and pagination engine is adapted from
[geekfoxcharlie/XHS-TextCard](https://github.com/geekfoxcharlie/XHS-TextCard),
also licensed under the MIT License. The upstream license and attribution notice
are included in this repository.

---

## 中文说明

把 Obsidian 笔记或选中的 Markdown 内容转换为 3:4 小红书图文卡片。所有内容
在本地 Canvas 中完成分页和渲染，不上传笔记。

## v1.0 功能

- 内置 12 款模板，支持 2:3、3:4、9:16 页面比例
- 支持 PNG、JPEG 和 1242 像素宽高清输出
- 插件内 Canvas 预览，可删除不需要的页面
- 单篇与批量快速生成命令直接保存图片，另有独立预览命令
- 浏览器开发预览支持实时 Markdown、页级编辑和 ZIP 下载
- 字号、行高、字间距、边距、文字/强调色、字体、封面、Logo、签名和水印
- 背景色由模板固定，不读取 Obsidian 明暗主题
- 9 组字体预设，并保留自定义字体族
- 封面和 Logo 可直接从 Vault 选择，无需手动输入路径
- 自定义模板实现暂时隐藏，源码、数据兼容和测试继续保留
- 品牌色、签名、字体和 Logo 预设
- `---` 强制分页、隐藏内容、内容块锁定和最大页数限制
- Obsidian 图片、Wiki 链接、笔记/章节嵌入、Callout、任务列表和脚注
- 可将 Obsidian 文件名自动作为正文一级标题，且不修改原笔记
- 生成后插入图片、复制首图、定位输出文件
- 文件夹批量、标签筛选、一篇笔记多模板和稳定目录更新
- YAML 属性和 `obsidian://xhs-text-card` 外部调用
- 编辑器、文件列表、命令面板和 Ribbon 多种入口

## 安装

### Community Plugins

审核上架后，可在 Obsidian 的 **设置 → 第三方插件 → 浏览** 中搜索
**Text to Card** 并安装。

### 手动安装

1. 从 [GitHub Releases](https://github.com/monvhh/text-to-card/releases/latest)
   下载 `main.js`、`manifest.json` 和 `styles.css`
2. 在 Vault 的 `.obsidian/plugins/` 中创建 `xhs-text-card` 文件夹
3. 将三个文件放入该文件夹，重启或重新加载 Obsidian
4. 在 **设置 → 第三方插件** 中启用 **Text to Card**

## 开发预览

```bash
npm install
npm run preview
```

访问 `http://localhost:5173/`。预览器与插件复用同一套模板、分页和 Canvas
渲染核心，不需要反复安装到 Obsidian。

## 构建与测试

```bash
npm run check:all
```

详细文档：

- [安装和使用方法](docs/USAGE.md)
- [完整产品功能](docs/PRODUCT.md)
- [自定义模板功能与实现说明](docs/CUSTOM_TEMPLATES.md)
- [测试与发布检查](docs/TESTING.md)

## 权限、隐私与披露

- 不需要账户、登录、付费或订阅，不包含广告或遥测
- 笔记解析、分页和图片生成均在本地完成，不会上传笔记内容
- 插件只读取用户主动选择的笔记及其引用资源，并把图片写入用户配置的
  Vault 输出目录；插件配置保存在 Obsidian 的插件数据目录
- Markdown 中的远程图片会由客户端直接请求原图片地址，因此可能向该图片
  主机暴露常规网络请求信息；Vault 内图片不会产生此类请求
- 插件不会自动发布内容到小红书或其他第三方平台

问题和建议请提交到
[GitHub Issues](https://github.com/monvhh/text-to-card/issues)。

## 开源说明

渲染、模板和分页引擎改编自
[geekfoxcharlie/XHS-TextCard](https://github.com/geekfoxcharlie/XHS-TextCard)，
原项目采用 MIT License。对应许可证和 NOTICE 已保留在仓库中，Obsidian
集成部分同样采用 MIT License。
