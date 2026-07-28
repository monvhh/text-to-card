import assert from "node:assert/strict";
import { build } from "esbuild";

const result = await build({
  stdin: {
    contents: [
      'export * from "../src/utils/markdown.ts";',
      'export * from "../src/utils/article-title.ts";'
    ].join("\n"),
    resolveDir: new URL("../scripts", import.meta.url).pathname,
    sourcefile: "markdown-test-entry.ts",
    loader: "ts"
  },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false
});
const source = result.outputFiles[0]?.text ?? "";
const module = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString(
    "base64"
  )}`
);

const embeddedNote = {
  path: "Notes/Embedded.md",
  extension: "md"
};
const imageFile = {
  path: "Assets/pic.png",
  extension: "png"
};
const app = {
  metadataCache: {
    getFirstLinkpathDest(link) {
      if (link === "Embedded") return embeddedNote;
      if (link === "pic.png") return imageFile;
      return null;
    }
  },
  vault: {
    async cachedRead() {
      return `---
private: true
---
# 开头

忽略这一节

## 目标章节

保留这段内容

## 下一章节

不应嵌入`;
    },
    getResourcePath(file) {
      return `resource://${file.path}`;
    }
  }
};

const markdown = `# 主笔记

![[Embedded#目标章节]]

![[pic.png]]

> [!tip] 重点提示

- [x] 已完成
- [ ] 待处理

需要说明[^1]。

[^1]: 这是脚注内容。
`;

const output = await module.prepareMarkdown(
  app,
  markdown,
  { path: "Notes/Main.md" },
  { stripFrontmatter: true }
);

assert.match(output, /## 目标章节/);
assert.match(output, /保留这段内容/);
assert.doesNotMatch(output, /下一章节/);
assert.match(output, /!\[\]\(resource:\/\/Assets\/pic\.png\)/);
assert.match(output, /> \*\*重点提示\*\*/);
assert.match(output, /- \[x\] 已完成/);
assert.match(output, /需要说明\[1\]/);
assert.match(output, /## 注释/);
assert.match(output, /\[1\] 这是脚注内容/);

assert.equal(
  module.addFileNameTitle("正文内容", "我的笔记", true),
  "# 我的笔记\n\n正文内容"
);
assert.equal(
  module.addFileNameTitle(
    "\n# 我的笔记\n\n正文内容",
    "我的笔记",
    true
  ),
  "\n# 我的笔记\n\n正文内容"
);
assert.equal(
  module.addFileNameTitle("# 另一个标题", "我的笔记", true),
  "# 我的笔记\n\n# 另一个标题"
);
assert.equal(
  module.addFileNameTitle("正文内容", "我的笔记", false),
  "正文内容"
);

console.log("Markdown feature tests passed");
