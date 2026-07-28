import {
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const vendorFiles = [
  "src/vendor/marked.umd.min.js",
  "src/vendor/constants.js",
  "src/vendor/markdown.js",
  "src/vendor/canvas-utils.js",
  "src/vendor/canvas-text-engine.js",
  "src/vendor/TemplateDefinitions.js",
  "src/vendor/CanvasRenderer.js",
  "src/vendor/TextSplitter.js"
];

const source = vendorFiles
  .map((file) =>
    readFileSync(resolve(projectRoot, file), "utf8")
  )
  .join("\n\n");

const output = `/*
Generated from the XHS-TextCard vendor engine.
Run npm run build:preview-core after changing files in src/vendor.
*/
${source}

globalThis.XHS_TEXT_CARD_CORE = {
  CanvasRenderer,
  TextSplitter
};
`;

const publicDirectory = resolve(projectRoot, "public");
mkdirSync(publicDirectory, { recursive: true });
writeFileSync(
  resolve(publicDirectory, "xhs-core.js"),
  output,
  "utf8"
);

console.log("Preview core generated: public/xhs-core.js");
