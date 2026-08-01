import {
  normalizePath,
  TFile,
  type App
} from "obsidian";
import type { XhsTextCardSettings } from "../settings";
import {
  mergePresetBundle,
  parsePresetBundle,
  serializePresetBundle
} from "../utils/preset-transfer";

export const DEFAULT_PRESET_FILE = "Text-to-Card-Presets.json";

export async function exportPresetsToVault(
  app: App,
  settings: XhsTextCardSettings,
  path = DEFAULT_PRESET_FILE
): Promise<string> {
  const normalized = normalizePath(path);
  const data = serializePresetBundle(settings);
  const existing = app.vault.getAbstractFileByPath(normalized);
  if (existing instanceof TFile) {
    await app.vault.process(existing, () => data);
  } else if (existing) {
    throw new Error(`导出路径已被文件夹占用：${normalized}`);
  } else {
    await app.vault.create(normalized, data);
  }
  return normalized;
}

export async function importPresetsFromVault(
  app: App,
  settings: XhsTextCardSettings,
  file: TFile
): Promise<XhsTextCardSettings> {
  const data = await app.vault.cachedRead(file);
  return mergePresetBundle(settings, parsePresetBundle(data));
}
