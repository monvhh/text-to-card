import assert from "node:assert/strict";
import { build } from "esbuild";

const module = await bundleModules([
  "src/utils/batch.ts",
  "src/utils/custom-templates.ts"
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
