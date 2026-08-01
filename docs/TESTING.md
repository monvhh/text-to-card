# 测试与发布检查

## 一键检查

```bash
npm install
npm run check:all
node --check main.js
```

`check:all` 包含：

- 分页指令、锁定块整体换页和超高块回退测试
- 笔记章节嵌入、图片、Callout、任务和脚注测试
- 文件夹/标签/模板筛选与自定义模板 JSON 测试
- 设置迁移、预设包、质量检查和表格行布局测试
- TypeScript 类型检查和 Obsidian 生产构建
- Vite 浏览器预览生产构建

## 浏览器回归

运行：

```bash
npm run preview
```

检查：

1. 修改 Markdown 后页数和 Canvas 自动更新
2. 隐藏页面后导出数量减少
3. 隐藏页面后 ZIP 使用编辑后的页面
4. 最大页数超限时显示警告并禁用 ZIP
5. 保存品牌预设后可恢复字体、颜色和签名
6. 自定义封面、Logo、模板切换和 PNG/JPEG 导出无控制台错误

## Obsidian 集成回归

1. 命令、Ribbon、编辑器右键和文件列表右键均能打开生成弹窗
2. 点击生成后进入分页编辑器
3. 默认设置折叠区初始收起，修改参数后刷新会重新分页并显示新画布尺寸
4. 从预览页返回修改设置时保留刚才的参数
5. 隐藏页面后导出数量正确
6. 插入图片、复制首图和定位结果按开关执行
7. 文件夹批量、标签过滤和多模板数量正确
8. 更新模式会覆盖同名图片并移除多余旧页
9. 自定义模板保持隐藏，配置数据升级后仍保留
10. 品牌预设重启后仍保留，模板顺序保持固定
11. `obsidian://xhs-text-card` 单文件和批量 URI 可调用
12. 包含表格的长笔记按表格行分页，边框和标题行正常
13. Mermaid 成功显示；错误语法降级为可读代码块而不阻塞导出
14. 远程图片和包含空格的 Vault 图片可导出，失败图片出现在质量警告中
15. 上次生成可以打开和分享，清除记录不会删除图片
16. 预设导出后可重新导入，已有同 ID 预设被更新且其他预设保留

## 自动发布

推送与 `manifest.json` 一致的 `x.y.z` 标签后，GitHub Actions 会执行完整检查、
验证 `package.json`、`manifest.json` 与 `versions.json`，然后创建 GitHub Release，
上传 `main.js`、`manifest.json`、`styles.css` 和 ZIP。

```bash
node scripts/verify-release-version.mjs 1.3.0
```

## 安装包检查

```bash
unzip -t release/xhs-text-card-x.y.z.zip
unzip -l release/xhs-text-card-x.y.z.zip
```

压缩包只应包含：

```text
xhs-text-card/main.js
xhs-text-card/manifest.json
xhs-text-card/styles.css
```
