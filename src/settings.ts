import { TEMPLATE_IDS, type TemplateId } from "./templates";
import {
  isPageRatio,
  type PageRatio
} from "./utils/page-ratio";

export type ExportFormat = "png" | "jpeg";

export const SETTINGS_SCHEMA_VERSION = 4;

export interface LastGenerationRecord {
  sourcePath: string;
  files: string[];
  outputFolder: string;
  generatedAt: string;
  pageCount: number;
  templateId: TemplateId;
  pageRatio: PageRatio;
}

export interface BrandPreset {
  id: string;
  name: string;
  signatureText: string;
  watermarkText: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  logoPath: string;
}

export interface CustomTemplate {
  id: string;
  name: string;
  baseTemplateId: TemplateId;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textPadding: number;
  bgColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
}

export interface XhsTextCardSettings {
  settingsVersion: number;
  templateId: TemplateId;
  templateSelection: string;
  exportFormat: ExportFormat;
  pageRatio: PageRatio;
  outputFolder: string;
  includeCover: boolean;
  coverImagePath: string;
  signatureText: string;
  useFileNameAsTitle: boolean;
  stripFrontmatter: boolean;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textPadding: number;
  bgColor: string;
  textColor: string;
  accentColor: string;
  watermarkText: string;
  showPageNumber: boolean;
  insertLinksAfterGenerate: boolean;
  copyFirstImageAfterGenerate: boolean;
  revealOutputAfterGenerate: boolean;
  maxPages: number;
  fontFamily: string;
  logoPath: string;
  brandPresetId: string;
  brandPresets: BrandPreset[];
  customTemplates: CustomTemplate[];
  favoriteTemplateIds: string[];
  recentTemplateIds: string[];
  updateExisting: boolean;
  outputNameSuffix: string;
  qualityCheck: boolean;
  shareAfterGenerate: boolean;
  lastGeneration: LastGenerationRecord | null;
  wechatAppId: string;
  wechatAppSecretName: string;
  draftDefaultAuthor: string;
  draftDefaultSourceUrl: string;
  wechatOpenComments: boolean;
  webhookPlatformName: string;
  webhookEndpoint: string;
  webhookTokenSecretName: string;
}

export const DEFAULT_SETTINGS: XhsTextCardSettings = {
  settingsVersion: SETTINGS_SCHEMA_VERSION,
  templateId: "minimalist-magazine",
  templateSelection: "minimalist-magazine",
  exportFormat: "png",
  pageRatio: "3:4",
  outputFolder: "XHS-Cards",
  includeCover: true,
  coverImagePath: "",
  signatureText: "",
  useFileNameAsTitle: true,
  stripFrontmatter: true,
  fontSize: 18,
  lineHeight: 1.7,
  letterSpacing: 0.3,
  textPadding: 45,
  bgColor: "#ffffff",
  textColor: "#1a1a1a",
  accentColor: "#8c3a3a",
  watermarkText: "",
  showPageNumber: true,
  insertLinksAfterGenerate: false,
  copyFirstImageAfterGenerate: false,
  revealOutputAfterGenerate: false,
  maxPages: 0,
  fontFamily: "'Noto Serif SC', serif",
  logoPath: "",
  brandPresetId: "",
  brandPresets: [],
  customTemplates: [],
  favoriteTemplateIds: [],
  recentTemplateIds: [],
  updateExisting: false,
  outputNameSuffix: "",
  qualityCheck: true,
  shareAfterGenerate: false,
  lastGeneration: null,
  wechatAppId: "",
  wechatAppSecretName: "",
  draftDefaultAuthor: "",
  draftDefaultSourceUrl: "",
  wechatOpenComments: false,
  webhookPlatformName: "",
  webhookEndpoint: "",
  webhookTokenSecretName: ""
};

export interface SettingsMigrationResult {
  settings: XhsTextCardSettings;
  migrated: boolean;
  fromVersion: number;
}

/**
 * Migrate and sanitize persisted settings without discarding user data.
 * Unknown keys are intentionally ignored so old experiments cannot leak
 * back into the active configuration surface.
 */
export function migrateSettings(
  saved: Record<string, unknown> | null | undefined
): SettingsMigrationResult {
  const source = saved ?? {};
  const fromVersion = readInteger(source.settingsVersion, 0);
  const legacy = { ...source };

  if (fromVersion < 1) {
    copyLegacy(legacy, "template", "templateId");
    copyLegacy(legacy, "format", "exportFormat");
    copyLegacy(legacy, "outputDir", "outputFolder");
    copyLegacy(legacy, "signature", "signatureText");
    copyLegacy(legacy, "titleFromFile", "useFileNameAsTitle");
  }

  if (fromVersion < 2 && typeof legacy.pageRatio !== "string") {
    const oldRatio = legacy.aspectRatio;
    if (oldRatio === "2:3" || oldRatio === "3:4" || oldRatio === "9:16") {
      legacy.pageRatio = oldRatio;
    }
  }

  const settings: XhsTextCardSettings = {
    ...DEFAULT_SETTINGS,
    ...pickKnownSettings(legacy),
    settingsVersion: SETTINGS_SCHEMA_VERSION
  };

  settings.brandPresets = Array.isArray(legacy.brandPresets)
    ? legacy.brandPresets.filter(isBrandPreset)
    : [];
  settings.customTemplates = Array.isArray(legacy.customTemplates)
    ? legacy.customTemplates.filter(isCustomTemplateShape)
    : [];
  settings.favoriteTemplateIds = readStringArray(
    legacy.favoriteTemplateIds
  );
  settings.recentTemplateIds = readStringArray(
    legacy.recentTemplateIds
  );
  settings.fontSize = clampNumber(settings.fontSize, 13, 24, 18);
  settings.lineHeight = clampNumber(settings.lineHeight, 1.2, 2.4, 1.7);
  settings.letterSpacing = clampNumber(
    settings.letterSpacing,
    0,
    2,
    0.3
  );
  settings.textPadding = clampNumber(settings.textPadding, 24, 72, 45);
  settings.maxPages = Math.round(
    clampNumber(settings.maxPages, 0, 50, 0)
  );

  if (!TEMPLATE_IDS.includes(settings.templateId)) {
    settings.templateId = DEFAULT_SETTINGS.templateId;
  }
  if (!isPageRatio(settings.pageRatio)) {
    settings.pageRatio = DEFAULT_SETTINGS.pageRatio;
  }
  if (settings.exportFormat !== "png" && settings.exportFormat !== "jpeg") {
    settings.exportFormat = DEFAULT_SETTINGS.exportFormat;
  }

  if (!settings.templateSelection) {
    settings.templateSelection = settings.templateId;
  }

  if (!isLastGeneration(settings.lastGeneration)) {
    settings.lastGeneration = null;
  }

  return {
    settings,
    migrated: fromVersion !== SETTINGS_SCHEMA_VERSION,
    fromVersion
  };
}

function pickKnownSettings(
  source: Record<string, unknown>
): Partial<XhsTextCardSettings> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const typedKey = key as keyof XhsTextCardSettings;
    const defaultValue = DEFAULT_SETTINGS[typedKey];
    const value = source[key];
    if (
      key in source &&
      !Array.isArray(defaultValue) &&
      (defaultValue === null || typeof value === typeof defaultValue)
    ) {
      result[key] = source[key];
    }
  }

  return result as Partial<XhsTextCardSettings>;
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

function isCustomTemplateShape(
  value: unknown
): value is CustomTemplate {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    TEMPLATE_IDS.includes(item.baseTemplateId as TemplateId)
  );
}

function copyLegacy(
  source: Record<string, unknown>,
  oldKey: string,
  newKey: string
): void {
  if (!(newKey in source) && oldKey in source) {
    source[newKey] = source[oldKey];
  }
}

function readInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value)
    ? value
    : fallback;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function clampNumber(
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;
}

function isLastGeneration(
  value: unknown
): value is LastGenerationRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.sourcePath === "string" &&
    Array.isArray(item.files) &&
    item.files.every((file) => typeof file === "string") &&
    typeof item.outputFolder === "string" &&
    typeof item.generatedAt === "string" &&
    typeof item.pageCount === "number" &&
    typeof item.templateId === "string" &&
    typeof item.pageRatio === "string"
  );
}
