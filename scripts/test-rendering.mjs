import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const context = vm.createContext({
  console,
  PREVIEW_WIDTH: 500,
  document: {
    createElement() {
      return {
        getContext() {
          return {
            font: "",
            measureText(text) {
              return { width: String(text).length * 8 };
            }
          };
        }
      };
    }
  },
  CanvasUtils: {
    measureTextWidth(_ctx, text, spacing = 0) {
      return String(text).length * (8 + spacing);
    }
  },
  setTimeout,
  clearTimeout
});

const engineSource = await readFile(
  new URL("../src/vendor/canvas-text-engine.js", import.meta.url),
  "utf8"
);
vm.runInContext(engineSource, context);
const CanvasTextEngine = vm.runInContext("CanvasTextEngine", context);
const engine = new CanvasTextEngine({
  fontSize: 18,
  lineHeight: 1.7,
  drawWidth: 400
});

const layouts = await engine.layoutToken({
  type: "table",
  header: [cell("名称"), cell("说明")],
  rows: [
    [cell("Text to Card"), cell("把 Markdown 生成图片")],
    [cell("分页"), cell("表格行可以跨页排列")]
  ]
});

assert.equal(
  layouts.map((layout) => layout.type).join(","),
  "table-row,table-row,table-row,space"
);
assert.equal(layouts[0].isHeader, true);
assert.equal(layouts[1].cells.length, 2);
assert.ok(layouts[1].height > 0);

console.log("Table rendering tests passed");

function cell(text) {
  return {
    text,
    tokens: [{ type: "text", text }]
  };
}
