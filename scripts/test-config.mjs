import assert from "node:assert/strict";
import { build } from "esbuild";

const module = await bundleModules([
  "src/utils/batch.ts",
  "src/utils/custom-templates.ts",
  "src/utils/layout-summary.ts",
  "src/settings.ts"
]);

assert.equal(module.isPathInFolder("Posts/a.md", "Posts"), true);
assert.equal(module.isPathInFolder("Other/a.md", "Posts"), false);
assert.equal(module.isPathInFolder("Other/a.md", ""), true);
assert.equal(
  module.matchesNormalizedTag(["#xhs", "#draft"], "xhs"),
  true
);
assert.deepEqual(
  module.parseTemplateIds(
    "blank, invalid, starry-night, blank"
  ),
  ["blank", "starry-night", "blank"]
);

const validTemplate = {
  id: "template-test",
  name: "测试模板",
  baseTemplateId: "blank",
  fontSize: 18,
  lineHeight: 1.8,
  letterSpacing: 0.5,
  textPadding: 40,
  bgColor: "#ffffff",
  textColor: "#222222",
  accentColor: "#f44830",
  fontFamily: "inherit"
};
const parsed = module.parseCustomTemplates(
  JSON.stringify(validTemplate)
);
assert.equal(parsed.length, 1);
assert.equal(parsed[0].name, "测试模板");
assert.throws(() =>
  module.parseCustomTemplates(
    JSON.stringify({
      ...validTemplate,
      bgColor: "red"
    })
  )
);

const merged = module.mergeCustomTemplates(
  [{ ...validTemplate, name: "旧名称" }],
  [validTemplate]
);
assert.equal(merged.length, 1);
assert.equal(merged[0].name, "测试模板");

assert.deepEqual(
  module.summarizeCardLayout({
    type: "heading",
    lines: [
      [
        { text: "一个" },
        { text: "标题" }
      ]
    ]
  }),
  {
    label: "标题",
    text: "一个标题"
  }
);
assert.deepEqual(
  module.summarizeCardLayout({ type: "space" }),
  {
    label: "留白",
    text: "保留原文中的段落间距"
  }
);
assert.equal(
  module.summarizeCardLayout({
    type: "list-item",
    text: "这是一段很长的内容".repeat(10)
  }).text.endsWith("…"),
  true
);
assert.equal(
  module.DEFAULT_SETTINGS.templateId,
  "minimalist-magazine"
);
assert.equal(module.DEFAULT_SETTINGS.bgColor, "#ffffff");
assert.equal(module.DEFAULT_SETTINGS.textColor, "#1a1a1a");

console.log("Batch and template config tests passed");

async function bundleModules(entryPoints) {
  const result = await build({
    stdin: {
      contents: entryPoints
        .map(
          (entry, index) =>
            `export * from "../${entry}";`
        )
        .join("\n"),
      resolveDir: new URL("../scripts", import.meta.url).pathname,
      sourcefile: "config-test-entry.ts",
      loader: "ts"
    },
    bundle: true,
    format: "esm",
    platform: "node",
    write: false,
    loader: { ".jpg": "dataurl" }
  });
  const source = result.outputFiles[0]?.text ?? "";
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString(
      "base64"
    )}`
  );
}
