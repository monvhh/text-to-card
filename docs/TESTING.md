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
- TypeScript 类型检查和 Obsidian 生产构建
- Vite 浏览器预览生产构建

## 浏览器回归

运行：

```bash
npm run preview
```

检查：

1. 修改 Markdown 后页数和 Canvas 自动更新
2. 合并后页数减少，拆分后恢复
3. 隐藏页面后 ZIP 使用编辑后的页面
4. 最大页数超限时显示警告并禁用 ZIP
5. 保存品牌预设后可恢复字体、颜色和签名
6. 自定义封面、Logo、模板切换和 PNG/JPEG 导出无控制台错误

## Obsidian 集成回归

1. 命令、Ribbon、编辑器右键和文件列表右键均能打开生成弹窗
2. 点击生成后进入分页编辑器
3. 页面移动、合并、拆分和隐藏后导出数量正确
4. 插入图片、复制首图和定位结果按开关执行
5. 文件夹批量、标签过滤和多模板数量正确
6. 更新模式会覆盖同名图片并移除多余旧页
7. 自定义模板 JSON 导入导出后重启仍保留
8. 品牌预设、收藏和最近使用排序重启后仍保留
9. `obsidian://xhs-text-card` 单文件和批量 URI 可调用

## 安装包检查

```bash
unzip -t release/xhs-text-card-1.0.0.zip
unzip -l release/xhs-text-card-1.0.0.zip
```

压缩包只应包含：

```text
xhs-text-card/main.js
xhs-text-card/manifest.json
xhs-text-card/styles.css
```
