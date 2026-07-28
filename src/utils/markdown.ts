import type { App, TFile } from "obsidian";
import { processPaginationDirectives } from "./pagination-directives";
import { normalizeMarkdownFeatures } from "./markdown-features";

export interface MarkdownPreparationOptions {
  stripFrontmatter: boolean;
}

export async function prepareMarkdown(
  app: App,
  markdown: string,
  sourceFile: TFile,
  options: MarkdownPreparationOptions
): Promise<string> {
  let result = markdown;

  if (options.stripFrontmatter) {
    result = stripLeadingFrontmatter(result);
  }

  result = await expandNoteEmbeds(
    app,
    result,
    sourceFile.path
  );
  result = resolveWikiImages(app, result, sourceFile.path);
  result = resolveMarkdownImages(app, result, sourceFile.path);
  result = flattenWikiLinks(result);
  result = normalizeMarkdownFeatures(result);
  result = processPaginationDirectives(result);

  return result.trim();
}

async function expandNoteEmbeds(
  app: App,
  markdown: string,
  sourcePath: string
): Promise<string> {
  return replaceAsync(
    markdown,
    /!\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|[^\]]+)?\]\]/g,
    async (original, linkPath: string, heading?: string) => {
      const target = app.metadataCache.getFirstLinkpathDest(
        linkPath.trim(),
        sourcePath
      );

      if (!target || target.extension !== "md") {
        return original;
      }

      const content = await app.vault.cachedRead(target);
      const withoutFrontmatter = stripLeadingFrontmatter(content);
      return heading
        ? extractHeadingSection(withoutFrontmatter, heading)
        : withoutFrontmatter;
    }
  );
}

function stripLeadingFrontmatter(markdown: string): string {
  return markdown.replace(
    /^\uFEFF?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/,
    ""
  );
}

function resolveWikiImages(
  app: App,
  markdown: string,
  sourcePath: string
): string {
  return markdown.replace(
    /!\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g,
    (original, linkPath: string) => {
      const target = app.metadataCache.getFirstLinkpathDest(
        linkPath.trim(),
        sourcePath
      );

      if (!target) {
        return original;
      }

      if (!isImageExtension(target.extension)) {
        return original;
      }

      return `![](${app.vault.getResourcePath(target)})`;
    }
  );
}

function extractHeadingSection(
  markdown: string,
  heading: string
): string {
  const lines = markdown.split(/\r?\n/);
  const target = heading.trim().toLowerCase();
  let start = -1;
  let depth = 7;

  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(
      lines[index] ?? ""
    );

    if (
      match &&
      match[2]?.replace(/\s+#+$/, "").trim().toLowerCase() ===
        target
    ) {
      start = index;
      depth = match[1]?.length ?? 7;
      break;
    }
  }

  if (start < 0) {
    return "";
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = /^(#{1,6})\s+/.exec(lines[index] ?? "");
    if (match && (match[1]?.length ?? 7) <= depth) {
      end = index;
      break;
    }
  }

  return lines.slice(start, end).join("\n");
}

function isImageExtension(extension: string): boolean {
  return [
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "svg",
    "bmp",
    "avif"
  ].includes(extension.toLowerCase());
}

async function replaceAsync(
  value: string,
  pattern: RegExp,
  replacer: (
    original: string,
    ...groups: string[]
  ) => Promise<string>
): Promise<string> {
  const matches = [...value.matchAll(pattern)];
  const replacements = await Promise.all(
    matches.map((match) =>
      replacer(match[0], ...match.slice(1))
    )
  );
  let index = 0;

  return value.replace(pattern, () => replacements[index++] ?? "");
}

function resolveMarkdownImages(
  app: App,
  markdown: string,
  sourcePath: string
): string {
  return markdown.replace(
    /!\[([^\]]*)\]\((<)?([^)\s>]+)(>)?(?:\s+["'][^"']*["'])?\)/g,
    (
      original,
      alt: string,
      _openAngle: string | undefined,
      imagePath: string
    ) => {
      if (
        /^(?:https?:|data:|blob:|app:)/i.test(imagePath) ||
        imagePath.startsWith("#")
      ) {
        return original;
      }

      const decodedPath = safeDecodeURIComponent(imagePath);
      const target = app.metadataCache.getFirstLinkpathDest(
        decodedPath,
        sourcePath
      );

      if (!target) {
        return original;
      }

      return `![${alt}](${app.vault.getResourcePath(target)})`;
    }
  );
}

function flattenWikiLinks(markdown: string): string {
  return markdown.replace(
    /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g,
    (_original, target: string, alias?: string) =>
      (alias ?? target).trim()
  );
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
