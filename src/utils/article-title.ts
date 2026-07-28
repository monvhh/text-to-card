export function addFileNameTitle(
  markdown: string,
  fileName: string,
  enabled: boolean
): string {
  if (!enabled) {
    return markdown;
  }

  const title = fileName.trim();

  if (!title || hasMatchingLeadingTitle(markdown, title)) {
    return markdown;
  }

  const content = markdown.trimStart();
  return content ? `# ${title}\n\n${content}` : `# ${title}`;
}

function hasMatchingLeadingTitle(
  markdown: string,
  title: string
): boolean {
  const firstLine = markdown.trimStart().split(/\r?\n/, 1)[0] ?? "";
  const match = firstLine.match(/^#(?!#)\s+(.+?)\s*#*\s*$/);

  return match?.[1]?.trim() === title;
}
