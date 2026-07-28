import type { XhsTextCardSettings } from "../settings";
import {
  TEMPLATE_IDS,
  type TemplateId
} from "../templates";

export interface FrontmatterSettingsResult {
  settings: XhsTextCardSettings;
  coverTitle?: string;
  hasOverrides: boolean;
}

export function applyFrontmatterSettings(
  defaults: XhsTextCardSettings,
  frontmatter: Record<string, unknown> | undefined
): FrontmatterSettingsResult {
  const settings = { ...defaults };

  if (!frontmatter) {
    return { settings, hasOverrides: false };
  }

  let hasOverrides = false;
  const assign = <K extends keyof XhsTextCardSettings>(
    key: K,
    value: XhsTextCardSettings[K] | undefined
  ) => {
    if (value !== undefined) {
      settings[key] = value;
      hasOverrides = true;
    }
  };

  assign(
    "templateId",
    readTemplate(frontmatter["xhs-template"])
  );
  const frontmatterTemplate = readTemplate(
    frontmatter["xhs-template"]
  );
  if (frontmatterTemplate) {
    assign("templateSelection", frontmatterTemplate);
  }
  assign(
    "exportFormat",
    readFormat(frontmatter["xhs-format"])
  );
  assign(
    "outputFolder",
    readString(frontmatter["xhs-output-folder"])
  );
  assign(
    "includeCover",
    readBoolean(frontmatter["xhs-cover"])
  );
  assign(
    "coverImagePath",
    readString(frontmatter["xhs-cover-image"], true)
  );
  assign(
    "signatureText",
    readString(frontmatter["xhs-signature"], true)
  );
  assign(
    "useFileNameAsTitle",
    readBoolean(frontmatter["xhs-use-file-title"])
  );
  assign(
    "watermarkText",
    readString(frontmatter["xhs-watermark"], true)
  );
  assign(
    "showPageNumber",
    readBoolean(frontmatter["xhs-page-number"])
  );
  assign(
    "fontSize",
    readNumber(frontmatter["xhs-font-size"], 13, 24)
  );
  assign(
    "lineHeight",
    readNumber(frontmatter["xhs-line-height"], 1.2, 2.4)
  );
  assign(
    "letterSpacing",
    readNumber(
      frontmatter["xhs-letter-spacing"],
      0,
      2
    )
  );
  assign(
    "textPadding",
    readNumber(frontmatter["xhs-padding"], 24, 72)
  );
  assign(
    "bgColor",
    readColor(frontmatter["xhs-bg-color"])
  );
  assign(
    "textColor",
    readColor(frontmatter["xhs-text-color"])
  );
  assign(
    "accentColor",
    readColor(frontmatter["xhs-accent-color"])
  );
  assign(
    "insertLinksAfterGenerate",
    readBoolean(frontmatter["xhs-insert-links"])
  );
  assign(
    "copyFirstImageAfterGenerate",
    readBoolean(frontmatter["xhs-copy-first-image"])
  );
  assign(
    "revealOutputAfterGenerate",
    readBoolean(frontmatter["xhs-reveal-output"])
  );
  assign(
    "maxPages",
    readNumber(frontmatter["xhs-max-pages"], 0, 50)
  );
  assign(
    "fontFamily",
    readString(frontmatter["xhs-font-family"])
  );
  assign(
    "logoPath",
    readString(frontmatter["xhs-logo"], true)
  );
  assign(
    "updateExisting",
    readBoolean(frontmatter["xhs-update-existing"])
  );
  assign(
    "outputNameSuffix",
    readString(frontmatter["xhs-output-suffix"], true)
  );

  const coverTitle = readString(
    frontmatter["xhs-cover-title"],
    true
  );

  if (coverTitle !== undefined) {
    hasOverrides = true;
  }

  return { settings, coverTitle, hasOverrides };
}

function readTemplate(value: unknown): TemplateId | undefined {
  return typeof value === "string" &&
    TEMPLATE_IDS.includes(value as TemplateId)
    ? (value as TemplateId)
    : undefined;
}

function readFormat(
  value: unknown
): XhsTextCardSettings["exportFormat"] | undefined {
  return value === "png" || value === "jpeg"
    ? value
    : undefined;
}

function readString(
  value: unknown,
  allowEmpty = false
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || allowEmpty ? trimmed : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return undefined;
}

function readNumber(
  value: unknown,
  min: number,
  max: number
): number | undefined {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(number) &&
    number >= min &&
    number <= max
    ? number
    : undefined;
}

function readColor(value: unknown): string | undefined {
  return typeof value === "string" &&
    /^#[0-9a-f]{6}$/i.test(value.trim())
    ? value.trim()
    : undefined;
}
