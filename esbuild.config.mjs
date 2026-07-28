import esbuild from "esbuild";
import process from "process";
import { builtinModules } from "node:module";
import { readFileSync } from "node:fs";

const markedFile = "src/vendor/marked.umd.min.js";
const engineFiles = [
  "src/vendor/constants.js",
  "src/vendor/markdown.js",
  "src/vendor/canvas-utils.js",
  "src/vendor/canvas-text-engine.js",
  "src/vendor/TemplateDefinitions.js",
  "src/vendor/CanvasRenderer.js",
  "src/vendor/TextSplitter.js"
];

const markedSource = readFileSync(markedFile, "utf8");
const engineSource = engineFiles
  .map((file) => readFileSync(file, "utf8"))
  .join("\n\n");

const banner = `/*
XHS Text Card for Obsidian
The card rendering engine is adapted from geekfoxcharlie/XHS-TextCard (MIT).
*/
${markedSource}
const marked = module.exports;
${engineSource}
globalThis.XHS_TEXT_CARD_CORE = {
  CanvasRenderer,
  TextSplitter
};
`;

const production = process.argv[2] === "production";

const context = await esbuild.context({
  banner: { js: banner },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtinModules
  ],
  loader: {
    ".jpg": "dataurl",
    ".jpeg": "dataurl",
    ".png": "dataurl"
  },
  format: "cjs",
  target: "es2021",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: production
});

if (production) {
  await context.rebuild();
  process.exit(0);
}

await context.watch();
