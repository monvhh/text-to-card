# Text to Card for Obsidian

把 Obsidian 笔记或选中的 Markdown 内容转换为 3:4 小红书图文卡片。所有内容
在本地 Canvas 中完成分页和渲染，不上传笔记。

## v1.0 功能

- 内置 12 款模板，支持 PNG、JPEG 和 1242 像素高清输出
- 插件内 Canvas 预览，可移动、合并、拆分和隐藏页面
- 浏览器开发预览支持实时 Markdown、页级编辑和 ZIP 下载
- 字号、行高、字间距、边距、主题色、字体、封面、Logo、签名和水印
- 自定义模板创建、复制、JSON 导入导出、收藏和最近使用
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
