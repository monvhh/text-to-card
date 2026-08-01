# 产品功能

## 产品定位

Text to Card for Obsidian 是一款本地运行的内容生产插件，将 Markdown 笔记、
选区或文件夹批量转换为适合发布的 2:3、3:4 或 9:16 图片卡片。

## 图片尺寸

| 类型 | 比例 | 基准画布 | 高清导出 |
| --- | --- | --- | --- |
| 小红书长文 | 2:3 | 500 × 750 | 1242 像素宽，高度自动计算 |
| 小红书图文 | 3:4 | 500 × 667 | 1242 像素宽，高度自动计算 |
| 短视频竖图 | 9:16 | 500 × 889 | 1242 像素宽，高度自动计算 |

切换比例会按新的可用高度重新执行分页，不会拉伸已有页面。

## 完整功能

### 内容与 Markdown

- 当前笔记、编辑器选区、文件列表和文件夹批量输入
- Obsidian `[[Wiki 链接]]`、`![[图片]]` 和标准 Markdown 图片
- `![[笔记]]` 整篇嵌入与 `![[笔记#章节]]` 章节嵌入
- 标题、段落、粗体、斜体、删除线、引用、列表、代码和图片
- Markdown 表格按行排版和跨页，Mermaid 使用 Obsidian 渲染后嵌入
- `==高亮==`、Callout 标题、已完成/未完成任务和脚注
- 可将 Obsidian 文件名作为正文一级标题，并自动避免同名标题重复
- 可关闭文章标题注入，关闭后仅按文档原内容生成
- 可选择移除 YAML Frontmatter

### 模板、排版与品牌

- 12 款内置模板和模板推荐参数
- 自定义模板创建、复制、删除和 JSON 导入导出已实现，当前隐藏界面入口
- 内置模板按固定顺序展示，不提供收藏或最近使用排序
- 字号、行高、字间距、内容边距、文字色和强调色
- 背景色由模板固定，与 Obsidian 明暗主题隔离
- 9 组字体预设和自定义 CSS 字体族
- 系统字体族、自定义封面图片、品牌 Logo、签名和水印
- 封面与 Logo 的 Vault 图片选择器和一键清除
- 品牌预设保存与一键应用
- 品牌签名和品牌水印集中在品牌预设区域管理
- 封面、页码和最大页数开关

### 分页编辑

- 智能分页和 `---` 强制分页
- `xhs-hide-start/end` 隐藏创作备注
- `xhs-keep-start/end` 锁定内容块不跨页
- 超高锁定块自动恢复智能拆分，避免裁切
- Obsidian 内生成前 Canvas 预览
- 预览并删除不需要导出的页面
- 最大页数限制和溢出提示
- 内容块高级编辑代码暂时保留，但不在产品界面中展示

### 导出与生成后动作

- **Make cards** 使用当前设置直接生成并保存单篇笔记或选区
- **Preview cards** 进入设置与分页预览，并可从预览页保存卡片
- 预览弹框只保留模板、品牌预设和封面选项，其他默认值集中在插件设置
- 预览弹框以默认收起的折叠表单展示并允许修改本次全部实际设置
- 修改设置后重新创建分页会话，预览页支持保留参数返回修改
- 2:3、3:4、9:16 三种页面比例，切换后自动重新分页
- PNG 无损与 JPEG 0.92 输出
- 1242 像素宽高清图片
- 时间戳目录保留历史版本
- 稳定输出目录覆盖同名图片并清理多余旧页
- 自动插回 Obsidian 图片链接
- 将首张图片复制到系统剪贴板
- 在文件管理器定位结果，必要时打开首图
- 浏览器单张下载和全部页面 ZIP
- 生成阶段与逐页保存进度、结构化错误代码和修复建议
- 导出尺寸、空文件和图片加载失败质量检查
- 上次生成记录，可再次打开或调用系统分享
- 品牌/自定义预设使用带版本的 JSON 文件导入导出

### 批量与自动化

- 按 Vault 文件夹批量处理 Markdown
- 按标签筛选笔记
- 一篇笔记同时生成多套内置模板
- 稳定目录批量更新已有图片
- **Make cards in batch** 选择范围和模板后直接保存，不进入分页预览
- `obsidian://xhs-text-card` URI 外部调用
- YAML `xhs-*` 属性按笔记覆盖参数

### 平台草稿

- **Make cards and save to platform draft** 先按当前默认设置生成卡片，再保存图片草稿
- **Save last generated cards to platform draft** 直接复用上次生成的全部图片
- 微信公众号：使用 `newspic` 图片消息结构保存贴图草稿，而不是图文文章
- 每张卡片上传为永久图片素材，最多 20 张，首张图片由微信自动作为封面
- 通用多平台 Webhook：只传递草稿元数据、目标平台列表和生成后的卡片图片
- AppSecret 与 Webhook Token 使用 Obsidian SecretStorage，不进入插件 `data.json`
- 所有发布操作必须由用户主动确认，只保存草稿，不调用正式发布接口

### 入口

- 命令面板：**Make cards**、**Preview cards**、**Make cards in batch**
- 可在 Obsidian 快捷键设置中为 **Make cards** 绑定按键，实现一键直接出图
- 左侧 Ribbon
- Markdown 编辑器右键菜单
- 文件列表右键菜单
- Obsidian URI
- **Open last generated cards** 与 **Share last generated cards**
- **Make cards and save to platform draft**
- **Save last generated cards to platform draft**

## 版本路线完成情况

- v0.2 可视化预览与参数调节：已完成
- v0.3 Obsidian 深度集成：已完成
- v0.4 分页编辑：已完成
- v0.5 品牌与模板系统：已完成
- v0.6 批量与自动化：已完成
- v1.0 统一交付、迁移兼容和完整测试：已完成
- v1.1 设置迁移、生成进度、错误提示和自动发布：已完成
- v1.2 表格、Mermaid、图片兼容和质量检查：已完成
- v1.3 上次生成记录、预设导入导出和系统分享：已完成
- v1.4 微信公众号草稿与多平台 Webhook：已完成

智能封面不在当前产品范围或路线图中。

## 当前边界

- 不直接登录或自动发布到小红书
- 微信公众号需要账号具备草稿/素材接口权限，并正确配置接口 IP 白名单
- 微信贴图要求所有卡片成为公众号永久图片素材，可能增加素材库占用
- 远程图片无法访问或超过 12 MB 时会保留原地址，并由质量检查提示加载失败
- 自定义字体使用设备已经安装的字体族，不内嵌字体文件
- 移动端生成大量高清页面时可能受到设备内存限制
- 分页预览只提供删除/隐藏，不提供移动、合并、拆分或自由画布拖拽

## 隐私

- 不收集遥测信息
- 卡片生成不会向第三方上传笔记；只有用户主动保存平台草稿时才发送生成后的图片
- 只读取用户选择的笔记、嵌入内容和批量范围
- 只在确认生成后写入指定 Vault 目录

## 技术结构

```text
src/
├── main.ts
├── settings.ts
├── services/
│   ├── card-generator.ts
│   ├── generation-errors.ts
│   ├── mermaid-renderer.ts
│   ├── quality-check.ts
│   ├── remote-images.ts
│   ├── preset-files.ts
│   └── post-generation.ts
├── publishing/
│   ├── publishing-service.ts
│   ├── wechat-api.ts
│   ├── webhook-publisher.ts
│   ├── render-draft-html.ts
│   └── image-conversion.ts
├── ui/
│   ├── generate-modal.ts
│   ├── page-editor-modal.ts
│   ├── batch-modal.ts
│   └── settings-tab.ts
├── utils/
│   ├── markdown.ts
│   ├── markdown-features.ts
│   ├── pagination-directives.ts
│   ├── frontmatter-settings.ts
│   ├── custom-templates.ts
│   ├── preset-transfer.ts
│   └── batch.ts
├── templates/
└── vendor/
```

渲染、智能分页和模板资源改编自
[geekfoxcharlie/XHS-TextCard](https://github.com/geekfoxcharlie/XHS-TextCard)，
采用 MIT License。
