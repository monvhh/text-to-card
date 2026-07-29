# 自定义模板功能说明

## 当前状态

自定义模板功能已完成基础实现，但当前产品界面暂时隐藏。隐藏原因是设置项较多，
会增加首次使用成本；现阶段优先保持模板选择和生成流程简单。

功能代码、用户已有数据和自动化测试均保留，没有删除或迁移数据。

## 已实现的功能

- 复制当前内置模板与排版参数，创建自定义模板
- 在设置页列出和删除自定义模板
- JSON 导入与导出
- 按模板 ID 合并导入数据，避免重复记录
- 功能重新启用后，可在默认模板和预览弹框中选择自定义模板
- 保存后继续兼容已有 `custom:<id>` 选择值
- 启动时保留 `customTemplates` 数据

## 数据结构

类型定义位于 `src/settings.ts` 的 `CustomTemplate`：

```ts
interface CustomTemplate {
  id: string;
  name: string;
  baseTemplateId: TemplateId;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textPadding: number;
  bgColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
}
```

每个自定义模板基于一个内置模板，只保存允许覆盖的排版和颜色参数。模板数据随
插件设置保存在 Obsidian 的插件数据文件中。

## 实现位置

- `src/feature-flags.ts`：控制界面是否展示
- `src/utils/custom-templates.ts`：创建、校验、应用和合并
- `src/ui/settings-tab.ts`：创建、导入、导出和删除界面
- `src/ui/generate-modal.ts`：生成前的模板选择
- `src/settings.ts`：类型与持久化字段
- `scripts/test-config.mjs`：JSON 校验、导入合并等测试

## 执行流程

1. 创建时读取当前内置模板及排版设置，生成稳定 ID。
2. 应用时先选择 `baseTemplateId`，再覆盖字号、行高、间距、颜色和字体。
3. 导入时严格校验字段类型、模板 ID 和十六进制颜色。
4. 合并时以自定义模板 ID 为键；相同 ID 的导入数据覆盖旧数据。
5. 删除只移除对应记录，不修改笔记或已经生成的图片。

当前版本的卡片背景色由内置基础模板固定，因此 `bgColor` 字段继续保留用于数据
兼容和未来恢复，但生成时不会覆盖基础模板背景。

## 如何重新启用

将 `src/feature-flags.ts` 中的：

```ts
export const SHOW_CUSTOM_TEMPLATES = false;
```

改为 `true`，然后运行：

```bash
npm run check:all
```

重新构建后，设置页和预览弹框会恢复自定义模板入口。正式重新启用前，建议补充
移动端交互测试、模板版本迁移和更明确的参数继承提示。
