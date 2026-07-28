import {
  TEMPLATE_IDS,
  type TemplateId
} from "../templates";

export function isPathInFolder(
  path: string,
  folder: string
): boolean {
  const normalized = folder.trim().replace(/^\/+|\/+$/g, "");
  return !normalized || path.startsWith(`${normalized}/`);
}

export function matchesNormalizedTag(
  tags: string[],
  tag: string
): boolean {
  const normalized = normalizeTag(tag);
  return (
    !normalized ||
    tags.some((value) => normalizeTag(value) === normalized)
  );
}

export function normalizeTag(value: string): string {
  return value.trim().replace(/^#/, "");
}

export function parseTemplateIds(value: string): TemplateId[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(
      (item): item is TemplateId =>
        TEMPLATE_IDS.includes(item as TemplateId)
    );
}
