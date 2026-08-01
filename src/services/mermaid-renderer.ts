import {
  Component,
  MarkdownRenderer,
  type App
} from "obsidian";

/** Convert Mermaid fences through Obsidian's own renderer so desktop and
 * mobile use the same Mermaid version as the host application. */
export async function renderMermaidBlocks(
  app: App,
  markdown: string,
  sourcePath: string
): Promise<string> {
  const pattern = /```mermaid\s*\r?\n([\s\S]*?)\r?\n```/gi;
  const matches = [...markdown.matchAll(pattern)];

  if (matches.length === 0) {
    return markdown;
  }

  const replacements: string[] = [];
  for (const match of matches) {
    const source = match[1]?.trim() ?? "";
    replacements.push(
      source
        ? await renderSingleMermaid(app, source, sourcePath)
        : match[0]
    );
  }

  let index = 0;
  return markdown.replace(
    pattern,
    () => replacements[index++] ?? ""
  );
}

async function renderSingleMermaid(
  app: App,
  source: string,
  sourcePath: string
): Promise<string> {
  const component = new Component();
  const container = document.createElement("div");
  container.className = "xhs-mermaid-render-host";
  document.body.appendChild(container);
  component.load();

  try {
    await MarkdownRenderer.render(
      app,
      `\`\`\`mermaid\n${source}\n\`\`\``,
      container,
      sourcePath,
      component
    );
    const svg = container.querySelector("svg");
    if (!svg) {
      return `\`\`\`text\nMermaid 渲染失败\n${source}\n\`\`\``;
    }

    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    ensureSvgSize(clone);
    const serialized = new XMLSerializer().serializeToString(clone);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      serialized
    )}`;
    return `![Mermaid diagram](${dataUrl})`;
  } catch (error) {
    console.warn("[Text to Card] Mermaid rendering failed", error);
    return `\`\`\`text\nMermaid 渲染失败\n${source}\n\`\`\``;
  } finally {
    component.unload();
    container.remove();
  }
}

function ensureSvgSize(svg: SVGElement): void {
  if (svg.getAttribute("width") && svg.getAttribute("height")) {
    return;
  }

  const viewBox = svg.getAttribute("viewBox")?.split(/\s+/).map(Number);
  if (viewBox?.length === 4) {
    svg.setAttribute("width", String(viewBox[2] || 800));
    svg.setAttribute("height", String(viewBox[3] || 450));
  } else {
    svg.setAttribute("width", "800");
    svg.setAttribute("height", "450");
  }
}
