export function normalizeMarkdownFeatures(
  markdown: string
): string {
  return normalizeFootnotes(normalizeCallouts(markdown));
}

export function normalizeCallouts(markdown: string): string {
  return markdown.replace(
    /^>\s*\[!([^\]]+)\][+-]?\s*(.*)$/gim,
    (_line, type: string, title: string) =>
      `> **${title.trim() || type.trim()}**`
  );
}

export function normalizeFootnotes(markdown: string): string {
  const definitions = new Map<string, string>();
  let result = markdown.replace(
    /^\[\^([^\]]+)\]:\s*(.+)$/gm,
    (_line, id: string, text: string) => {
      definitions.set(id, text.trim());
      return "";
    }
  );

  if (definitions.size === 0) {
    return result;
  }

  result = result.replace(
    /\[\^([^\]]+)\]/g,
    (_reference, id: string) => `[${id}]`
  );
  const notes = [...definitions]
    .map(([id, text]) => `[${id}] ${text}`)
    .join("\n");

  return `${result.trim()}\n\n## 注释\n\n${notes}`;
}
