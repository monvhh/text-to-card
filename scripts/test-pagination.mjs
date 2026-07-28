import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { build } from "esbuild";

const directiveBuild = await build({
  entryPoints: ["src/utils/pagination-directives.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false
});
const directiveSource =
  directiveBuild.outputFiles[0]?.text ?? "";
const directiveModule = await import(
  `data:text/javascript;base64,${Buffer.from(
    directiveSource
  ).toString("base64")}`
);

const processed = directiveModule.processPaginationDirectives(`
保留内容
<!-- xhs-hide-start -->
隐藏内容
<!-- xhs-hide-end -->
<!--XHS-KEEP-START-->
锁定内容
<!-- xhs-keep-end -->
`);

assert.equal(processed.includes("隐藏内容"), false);
assert.equal(
  processed.includes("<!-- xhs-keep-start -->"),
  true
);
assert.equal(
  processed.includes("<!-- xhs-keep-end -->"),
  true
);

let currentTokens = [];
const context = vm.createContext({
  console,
  PREVIEW_WIDTH: 500,
  PREVIEW_HEIGHT: 667,
  TemplateDefinitions: {
    getContentBox: () => ({ width: 400, height: 100 })
  },
  CanvasTextEngine: class {
    updateConfig() {}

    async layoutToken(token) {
      return token.layout ? [token.layout] : [];
    }

    splitLayout() {
      return null;
    }
  },
  MarkdownParser: { init() {} },
  marked: {
    lexer: () => currentTokens
  }
});

const splitterSource = await readFile(
  new URL("../src/vendor/TextSplitter.js", import.meta.url),
  "utf8"
);
vm.runInContext(splitterSource, context);
const TextSplitter = vm.runInContext("TextSplitter", context);
const splitter = new TextSplitter({ hasCover: false }, "blank");

currentTokens = [
  layoutToken("before", 40),
  directiveToken("xhs-keep-start"),
  layoutToken("locked-title", 40),
  layoutToken("locked-body", 40),
  directiveToken("xhs-keep-end")
];

const keptPages = await splitter.split("test");
assert.deepEqual(
  normalizePages(keptPages),
  [["before"], ["locked-title", "locked-body"]]
);

currentTokens = [
  layoutToken("before", 40),
  directiveToken("xhs-keep-start"),
  layoutToken("too-tall-a", 70),
  layoutToken("too-tall-b", 70),
  directiveToken("xhs-keep-end")
];

const oversizedPages = await splitter.split("test");
assert.deepEqual(
  normalizePages(oversizedPages),
  [["before"], ["too-tall-a"], ["too-tall-b"]]
);

console.log("Pagination directive tests passed");

function layoutToken(text, height) {
  return {
    type: "paragraph",
    layout: { type: "text", text, height }
  };
}

function directiveToken(name) {
  return {
    type: "html",
    raw: `<!-- ${name} -->`
  };
}

function normalizePages(pages) {
  return JSON.parse(
    JSON.stringify(
      pages.map((page) =>
        page.map((layout) => layout.text)
      )
    )
  );
}
