const HIDE_BLOCK =
  /<!--\s*xhs-hide-start\s*-->[\s\S]*?<!--\s*xhs-hide-end\s*-->/gi;
const UNCLOSED_HIDE_BLOCK =
  /<!--\s*xhs-hide-start\s*-->[\s\S]*$/gi;
const KEEP_START =
  /<!--\s*xhs-keep-start\s*-->/gi;
const KEEP_END =
  /<!--\s*xhs-keep-end\s*-->/gi;

export function processPaginationDirectives(
  markdown: string
): string {
  return markdown
    .replace(HIDE_BLOCK, "")
    .replace(UNCLOSED_HIDE_BLOCK, "")
    .replace(KEEP_START, "<!-- xhs-keep-start -->")
    .replace(KEEP_END, "<!-- xhs-keep-end -->");
}
