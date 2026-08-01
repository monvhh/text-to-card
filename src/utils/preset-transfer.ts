import type {
  BrandPreset,
  CustomTemplate,
  XhsTextCardSettings
} from "../settings";

export interface PresetBundle {
  format: "text-to-card-presets";
  version: 1;
  exportedAt: string;
  brandPresets: BrandPreset[];
  customTemplates: CustomTemplate[];
}

export function createPresetBundle(
  settings: XhsTextCardSettings,
  now = new Date()
): PresetBundle {
  return {
    format: "text-to-card-presets",
    version: 1,
    exportedAt: now.toISOString(),
    brandPresets: settings.brandPresets,
    customTemplates: settings.customTemplates
  };
}

export function serializePresetBundle(
  settings: XhsTextCardSettings
): string {
  return JSON.stringify(createPresetBundle(settings), null, 2);
}

export function parsePresetBundle(value: string): PresetBundle {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("预设文件不是有效的 JSON 对象");
  }

  const item = parsed as Record<string, unknown>;
  if (
    item.format !== "text-to-card-presets" ||
    item.version !== 1 ||
    !Array.isArray(item.brandPresets) ||
    !Array.isArray(item.customTemplates) ||
    !item.brandPresets.every(isBrandPreset)
  ) {
    throw new Error("预设文件格式或版本不受支持");
  }

  return parsed as PresetBundle;
}

export function mergePresetBundle(
  settings: XhsTextCardSettings,
  bundle: PresetBundle
): XhsTextCardSettings {
  return {
    ...settings,
    brandPresets: mergeById(
      settings.brandPresets,
      bundle.brandPresets
    ),
    customTemplates: mergeById(
      settings.customTemplates,
      bundle.customTemplates
    )
  };
}

function mergeById<T extends { id: string }>(
  current: T[],
  imported: T[]
): T[] {
  const result = new Map(current.map((item) => [item.id, item]));
  for (const item of imported) {
    result.set(item.id, item);
  }
  return [...result.values()];
}

function isBrandPreset(value: unknown): value is BrandPreset {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return [
    "id",
    "name",
    "signatureText",
    "watermarkText",
    "bgColor",
    "textColor",
    "accentColor",
    "fontFamily",
    "logoPath"
  ].every((key) => typeof item[key] === "string");
}
