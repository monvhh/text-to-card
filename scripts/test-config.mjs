import assert from "node:assert/strict";
import { build } from "esbuild";

const module = await bundleModules([
  "src/feature-flags.ts",
  "src/utils/batch.ts",
  "src/utils/custom-templates.ts",
  "src/utils/frontmatter-settings.ts",
  "src/utils/font-presets.ts",
  "src/utils/layout-summary.ts",
  "src/utils/page-ratio.ts",
  "src/utils/preset-transfer.ts",
  "src/services/quality-check.ts",
  "src/settings.ts",
  "src/templates/index.ts"
]);

assert.equal(module.SHOW_CUSTOM_TEMPLATES, false);
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
assert.equal(module.DEFAULT_SETTINGS.accentColor, "#8c3a3a");
assert.equal(module.DEFAULT_SETTINGS.fontSize, 18);
assert.equal(module.DEFAULT_SETTINGS.pageRatio, "3:4");
assert.equal(module.DEFAULT_SETTINGS.useFileNameAsTitle, true);
assert.equal(module.DEFAULT_SETTINGS.qualityCheck, true);
assert.equal(module.DEFAULT_SETTINGS.lastGeneration, null);

const migrated = module.migrateSettings({
  template: "blank",
  format: "jpeg",
  outputDir: "Cards",
  fontSize: 99,
  brandPresets: []
});
assert.equal(migrated.fromVersion, 0);
assert.equal(migrated.migrated, true);
assert.equal(migrated.settings.templateId, "blank");
assert.equal(migrated.settings.exportFormat, "jpeg");
assert.equal(migrated.settings.outputFolder, "Cards");
assert.equal(migrated.settings.fontSize, 24);
assert.equal(
  migrated.settings.settingsVersion,
  module.SETTINGS_SCHEMA_VERSION
);

const presetJson = module.serializePresetBundle({
  ...module.DEFAULT_SETTINGS,
  brandPresets: [{
    id: "brand-test",
    name: "测试品牌",
    signatureText: "签名",
    watermarkText: "水印",
    bgColor: "#ffffff",
    textColor: "#111111",
    accentColor: "#ff0000",
    fontFamily: "inherit",
    logoPath: ""
  }]
});
assert.equal(module.parsePresetBundle(presetJson).brandPresets.length, 1);

const quality = module.createQualityReport();
module.checkRenderedPage(quality, {
  page: 1,
  canvasWidth: 1242,
  canvasHeight: 1657,
  expectedWidth: 1242,
  expectedHeight: 1657,
  byteLength: 100
});
assert.equal(quality.passed, true);
assert.equal(
  module.applyFrontmatterSettings(module.DEFAULT_SETTINGS, {
    "xhs-use-file-title": false
  }).settings.useFileNameAsTitle,
  false
);
assert.equal(
  module.applyFrontmatterSettings(module.DEFAULT_SETTINGS, {
    "xhs-page-ratio": "9:16"
  }).settings.pageRatio,
  "9:16"
);
assert.deepEqual(
  module.getPageDimensions("2:3"),
  { width: 500, height: 750 }
);
assert.deepEqual(
  module.getPageDimensions("3:4"),
  { width: 500, height: 667 }
);
assert.deepEqual(
  module.getPageDimensions("9:16"),
  { width: 500, height: 889 }
);
assert.equal(module.FONT_PRESETS.length, 9);
assert.equal(
  module.findFontPresetByValue("'Noto Serif SC', serif")?.id,
  "noto-serif-sc"
);
const minimalistConfig = module.getTemplate(
  "minimalist-magazine"
).config;
assert.equal(minimalistConfig.fontSize, 18);
assert.equal(minimalistConfig.accentColor, "#8C3A3A");
assert.equal(minimalistConfig.h1Scale, 2);
assert.equal(minimalistConfig.h2Scale, 1.35);
assert.equal(minimalistConfig.h3Scale, 1.15);
assert.equal(minimalistConfig.modernBlockquote, true);

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
